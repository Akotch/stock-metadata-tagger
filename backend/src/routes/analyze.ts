import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init';
import { createModelEndpoint } from '../lib/modelEndpoint/factory';
import { ImageRecord, AnalyzeRequest, ImageAnalysisResult, ValidationResult } from '../types';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 50 // Max 50 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation function
function validateMetadata(metadata: any, preset?: any): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!metadata) {
    errors.push('No metadata provided');
    return { is_valid: false, warnings, errors };
  }

  // Title validation
  if (!metadata.title || metadata.title.trim().length === 0) {
    errors.push('Title is required');
  } else {
    const maxLength = preset?.title_max_length || 70;
    if (metadata.title.length > maxLength) {
      warnings.push(`Title exceeds ${maxLength} characters (${metadata.title.length})`);
    }
  }

  // Alt text validation
  if (!metadata.alt_text || metadata.alt_text.trim().length === 0) {
    warnings.push('Alt text is missing');
  } else if (metadata.alt_text.length > 125) {
    warnings.push(`Alt text exceeds 125 characters (${metadata.alt_text.length})`);
  }

  // Keywords validation
  if (!Array.isArray(metadata.keywords)) {
    errors.push('Keywords must be an array');
  } else {
    const minKeywords = preset?.keywords_min || 15;
    const maxKeywords = preset?.keywords_max || 25;
    
    if (metadata.keywords.length < minKeywords) {
      warnings.push(`Too few keywords: ${metadata.keywords.length} (minimum: ${minKeywords})`);
    }
    if (metadata.keywords.length > maxKeywords) {
      warnings.push(`Too many keywords: ${metadata.keywords.length} (maximum: ${maxKeywords})`);
    }

    // Check for duplicates
    const uniqueKeywords = [...new Set(metadata.keywords.map((k: string) => k.toLowerCase()))];
    if (uniqueKeywords.length !== metadata.keywords.length) {
      warnings.push('Duplicate keywords detected');
    }
  }

  return {
    is_valid: errors.length === 0,
    warnings,
    errors
  };
}

// POST /api/analyze - Upload and analyze images
router.post('/', upload.array('images'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { session_id, session_name, preset_id }: AnalyzeRequest = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Create or get session
    let sessionId = session_id;
    if (!sessionId) {
      sessionId = uuidv4();
      const name = session_name || `Session ${new Date().toLocaleString()}`;
      
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT INTO sessions (id, name) VALUES (?, ?)',
          [sessionId, name],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Get preset if specified
    let preset: any = null;
    if (preset_id) {
      preset = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM presets WHERE id = ?',
          [preset_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }

    // Insert image records
    const imageRecords: ImageRecord[] = [];
    const insertPromises = files.map(file => {
      const imageId = uuidv4();
      const record: Partial<ImageRecord> = {
        id: imageId,
        session_id: sessionId,
        filename: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        status: 'pending'
      };

      return new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT INTO images 
           (id, session_id, filename, original_name, file_path, file_size, mime_type, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.session_id,
            record.filename,
            record.original_name,
            record.file_path,
            record.file_size,
            record.mime_type,
            record.status
          ],
          function(err) {
            if (err) {
              reject(err);
            } else {
              imageRecords.push(record as ImageRecord);
              resolve();
            }
          }
        );
      });
    });

    await Promise.all(insertPromises);

    // Start processing images asynchronously
    processImagesAsync(imageRecords, preset);

    // Return immediate response with session info
    const results: ImageAnalysisResult[] = imageRecords.map(record => ({
      id: record.id,
      filename: record.original_name,
      status: 'pending'
    }));

    res.json({
      session_id: sessionId,
      results
    });

  } catch (error) {
    console.error('Analyze route error:', error);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

// GET /api/analyze/:sessionId - Get analysis results
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const images = await new Promise<ImageRecord[]>((resolve, reject) => {
      db.all(
        'SELECT * FROM images WHERE session_id = ? ORDER BY created_at',
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as ImageRecord[]);
        }
      );
    });

    const results: ImageAnalysisResult[] = images.map(image => {
      const result: ImageAnalysisResult = {
        id: image.id,
        filename: image.original_name,
        status: image.status as any
      };

      if (image.status === 'completed' && image.alt_text && image.title && image.keywords) {
        result.metadata = {
          alt_text: image.alt_text,
          title: image.title,
          keywords: JSON.parse(image.keywords)
        };
      }

      if (image.status === 'error' && image.error_message) {
        result.error = image.error_message;
      }

      return result;
    });

    res.json({
      session_id: sessionId,
      results
    });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// Async function to process images
async function processImagesAsync(imageRecords: ImageRecord[], preset: any) {
  for (const record of imageRecords) {
    try {
      // Update status to processing
      await new Promise<void>((resolve, reject) => {
        db.run(
          'UPDATE images SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['processing', record.id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Analyze image with model endpoint
      const endpoint = createModelEndpoint();
      const result = await endpoint.analyzeImage({
        filePathOrBase64: record.file_path,
        prompt: 'Please analyze this image and provide metadata in the specified JSON format.'
      });
      const metadata = {
        alt_text: result.alt_text,
        title: result.title,
        keywords: result.keywords
      };
      
      // Validate metadata
      const validation = validateMetadata(metadata, preset);
      
      // Update record with results
      await new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE images SET 
           alt_text = ?, title = ?, keywords = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [
            metadata.alt_text,
            metadata.title,
            JSON.stringify(metadata.keywords),
            'completed',
            record.id
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`Successfully processed image: ${record.original_name}`);

    } catch (error) {
      console.error(`Failed to process image ${record.original_name}:`, error);
      
      // Update record with error
      await new Promise<void>((resolve, reject) => {
        db.run(
          'UPDATE images SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['error', error instanceof Error ? error.message : 'Unknown error', record.id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  }
}

export default router;