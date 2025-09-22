import express from 'express';
import { db } from '../database/init';
import { ImageRecord, Preset, ExportRequest } from '../types';

const router = express.Router();

// POST /api/export - Export session data
router.post('/', async (req, res) => {
  try {
    const { session_id, preset_id, format = 'csv', image_ids }: ExportRequest = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be csv or json' });
    }

    // Get preset if specified
    let preset: Preset | null = null;
    if (preset_id) {
      preset = await new Promise<Preset | null>((resolve, reject) => {
        db.get(
          'SELECT * FROM presets WHERE id = ?',
          [preset_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row as Preset | null);
          }
        );
      });

      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' });
      }
    }

    // Build query for images
    let query = 'SELECT * FROM images WHERE session_id = ? AND status = "completed"';
    const queryParams: any[] = [session_id];

    if (image_ids && image_ids.length > 0) {
      const placeholders = image_ids.map(() => '?').join(',');
      query += ` AND id IN (${placeholders})`;
      queryParams.push(...image_ids);
    }

    query += ' ORDER BY created_at';

    // Get images
    const images = await new Promise<ImageRecord[]>((resolve, reject) => {
      db.all(query, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as ImageRecord[]);
      });
    });

    if (images.length === 0) {
      return res.status(404).json({ error: 'No completed images found for export' });
    }

    // Generate export data based on format
    if (format === 'csv') {
      const csvData = generateCSV(images, preset);
      const filename = `metadata_export_${session_id}_${Date.now()}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } else {
      const jsonData = generateJSON(images, preset);
      const filename = `metadata_export_${session_id}_${Date.now()}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(jsonData);
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// GET /api/export/preview/:sessionId - Preview export data
router.get('/preview/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { preset_id, format = 'json', limit = 5 } = req.query;

    // Get preset if specified
    let preset: Preset | null = null;
    if (preset_id) {
      preset = await new Promise<Preset | null>((resolve, reject) => {
        db.get(
          'SELECT * FROM presets WHERE id = ?',
          [preset_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row as Preset | null);
          }
        );
      });
    }

    // Get limited images for preview
    const images = await new Promise<ImageRecord[]>((resolve, reject) => {
      db.all(
        'SELECT * FROM images WHERE session_id = ? AND status = "completed" ORDER BY created_at LIMIT ?',
        [sessionId, parseInt(limit as string)],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as ImageRecord[]);
        }
      );
    });

    if (images.length === 0) {
      return res.status(404).json({ error: 'No completed images found' });
    }

    // Generate preview data
    if (format === 'csv') {
      const csvData = generateCSV(images, preset);
      res.json({ 
        format: 'csv',
        preview: csvData,
        total_images: images.length
      });
    } else {
      const jsonData = generateJSON(images, preset);
      res.json({
        format: 'json',
        preview: jsonData,
        total_images: images.length
      });
    }

  } catch (error) {
    console.error('Export preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

function generateCSV(images: ImageRecord[], preset: Preset | null): string {
  // Shutterstock format based on the sample provided
  if (preset && preset.id === 'shutterstock') {
    const headers = ['Filename', 'Description', 'Keywords', 'Categories', 'Editorial', 'Mature content', 'Illustration'];
    const rows = [headers.join(',')];

    images.forEach(image => {
      const keywords = image.keywords ? JSON.parse(image.keywords) : [];
      const keywordString = keywords.join(','); // Comma-separated for Shutterstock
      
      const row = [
        escapeCSV(image.original_name),
        escapeCSV(image.alt_text || image.title || ''), // Use alt_text as description
        escapeCSV(keywordString),
        escapeCSV(''), // Categories - empty for user to fill
        escapeCSV('no'), // Editorial - default to 'no'
        escapeCSV('no'), // Mature content - default to 'no'
        escapeCSV('no')  // Illustration - default to 'no'
      ];

      rows.push(row.join(','));
    });

    return rows.join('\n');
  }
  
  // Default format for other presets
  const headers = ['filename', 'title', 'alt_text', 'keywords'];
  
  // Add preset-specific headers if needed
  if (preset) {
    switch (preset.id) {
      case 'adobe-stock':
        headers.push('category', 'releases_required');
        break;
    }
  }

  const rows = [headers.join(',')];

  images.forEach(image => {
    const keywords = image.keywords ? JSON.parse(image.keywords) : [];
    const keywordString = keywords.join('; ');
    
    const row = [
      escapeCSV(image.original_name),
      escapeCSV(image.title || ''),
      escapeCSV(image.alt_text || ''),
      escapeCSV(keywordString)
    ];

    // Add preset-specific data
    if (preset) {
      switch (preset.id) {
        case 'adobe-stock':
          row.push('', 'No'); // category, releases_required
          break;
      }
    }

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

function generateJSON(images: ImageRecord[], preset: Preset | null): any {
  const exportData = {
    export_info: {
      timestamp: new Date().toISOString(),
      preset: preset ? {
        id: preset.id,
        name: preset.name,
        description: preset.description
      } : null,
      total_images: images.length
    },
    images: images.map(image => {
      const keywords = image.keywords ? JSON.parse(image.keywords) : [];
      
      const imageData: any = {
        id: image.id,
        filename: image.original_name,
        title: image.title,
        alt_text: image.alt_text,
        keywords: keywords,
        file_info: {
          size: image.file_size,
          mime_type: image.mime_type,
          created_at: image.created_at,
          updated_at: image.updated_at
        }
      };

      // Add preset-specific metadata
      if (preset) {
        imageData.preset_info = {
          preset_id: preset.id,
          preset_name: preset.name,
          validation: validateForPreset(image, preset)
        };
      }

      return imageData;
    })
  };

  return exportData;
}

function validateForPreset(image: ImageRecord, preset: Preset): any {
  const validation: any = {
    title_valid: true,
    keywords_valid: true,
    warnings: []
  };

  // Title validation
  if (image.title && image.title.length > preset.title_max_length) {
    validation.title_valid = false;
    validation.warnings.push(`Title exceeds ${preset.title_max_length} characters`);
  }

  // Keywords validation
  if (image.keywords) {
    const keywords = JSON.parse(image.keywords);
    if (keywords.length < preset.keywords_min) {
      validation.keywords_valid = false;
      validation.warnings.push(`Too few keywords (${keywords.length}/${preset.keywords_min})`);
    }
    if (keywords.length > preset.keywords_max) {
      validation.keywords_valid = false;
      validation.warnings.push(`Too many keywords (${keywords.length}/${preset.keywords_max})`);
    }
  }

  return validation;
}

function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If the value contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

export default router;