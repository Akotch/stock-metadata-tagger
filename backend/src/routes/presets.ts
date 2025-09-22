import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init';
import { Preset, KeywordRules } from '../types';

const router = express.Router();

// GET /api/presets - Get all presets
router.get('/', async (req, res) => {
  try {
    const presets = await new Promise<Preset[]>((resolve, reject) => {
      db.all(
        'SELECT * FROM presets ORDER BY name',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as Preset[]);
        }
      );
    });

    // Parse keyword_rules JSON for each preset
    const parsedPresets = presets.map(preset => ({
      ...preset,
      keyword_rules: JSON.parse(preset.keyword_rules)
    }));

    res.json(parsedPresets);
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json({ error: 'Failed to get presets' });
  }
});

// GET /api/presets/:id - Get specific preset
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const preset = await new Promise<Preset | null>((resolve, reject) => {
      db.get(
        'SELECT * FROM presets WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as Preset | null);
        }
      );
    });

    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    // Parse keyword_rules JSON
    const parsedPreset = {
      ...preset,
      keyword_rules: JSON.parse(preset.keyword_rules)
    };

    res.json(parsedPreset);
  } catch (error) {
    console.error('Get preset error:', error);
    res.status(500).json({ error: 'Failed to get preset' });
  }
});

// POST /api/presets - Create new preset
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      title_max_length = 70,
      keywords_min = 15,
      keywords_max = 25,
      keyword_rules = {
        singular_nouns: true,
        no_duplicates: true,
        relevant_only: true
      },
      export_format = 'csv'
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Preset name is required' });
    }

    // Validate keyword_rules
    if (typeof keyword_rules !== 'object') {
      return res.status(400).json({ error: 'Invalid keyword_rules format' });
    }

    // Validate export_format
    if (!['csv', 'json'].includes(export_format)) {
      return res.status(400).json({ error: 'Invalid export_format. Must be csv or json' });
    }

    // Validate numeric fields
    if (title_max_length < 1 || title_max_length > 200) {
      return res.status(400).json({ error: 'title_max_length must be between 1 and 200' });
    }

    if (keywords_min < 1 || keywords_max < keywords_min || keywords_max > 50) {
      return res.status(400).json({ error: 'Invalid keywords range' });
    }

    const presetId = uuidv4();

    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO presets 
         (id, name, description, title_max_length, keywords_min, keywords_max, keyword_rules, export_format)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          presetId,
          name.trim(),
          description?.trim() || null,
          title_max_length,
          keywords_min,
          keywords_max,
          JSON.stringify(keyword_rules),
          export_format
        ],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('Preset name already exists'));
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        }
      );
    });

    // Return the created preset
    const createdPreset = await new Promise<Preset>((resolve, reject) => {
      db.get(
        'SELECT * FROM presets WHERE id = ?',
        [presetId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as Preset);
        }
      );
    });

    res.status(201).json({
      ...createdPreset,
      keyword_rules: JSON.parse(createdPreset.keyword_rules)
    });

  } catch (error) {
    console.error('Create preset error:', error);
    if (error instanceof Error && error.message === 'Preset name already exists') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create preset' });
    }
  }
});

// PUT /api/presets/:id - Update preset
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      title_max_length,
      keywords_min,
      keywords_max,
      keyword_rules,
      export_format
    } = req.body;

    // Check if preset exists
    const existingPreset = await new Promise<Preset | null>((resolve, reject) => {
      db.get(
        'SELECT * FROM presets WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as Preset | null);
        }
      );
    });

    if (!existingPreset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    // Validate fields if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Preset name cannot be empty' });
    }

    if (export_format !== undefined && !['csv', 'json'].includes(export_format)) {
      return res.status(400).json({ error: 'Invalid export_format. Must be csv or json' });
    }

    if (title_max_length !== undefined && (title_max_length < 1 || title_max_length > 200)) {
      return res.status(400).json({ error: 'title_max_length must be between 1 and 200' });
    }

    if (keywords_min !== undefined || keywords_max !== undefined) {
      const minVal = keywords_min !== undefined ? keywords_min : existingPreset.keywords_min;
      const maxVal = keywords_max !== undefined ? keywords_max : existingPreset.keywords_max;
      
      if (minVal < 1 || maxVal < minVal || maxVal > 50) {
        return res.status(400).json({ error: 'Invalid keywords range' });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description?.trim() || null);
    }

    if (title_max_length !== undefined) {
      updates.push('title_max_length = ?');
      values.push(title_max_length);
    }

    if (keywords_min !== undefined) {
      updates.push('keywords_min = ?');
      values.push(keywords_min);
    }

    if (keywords_max !== undefined) {
      updates.push('keywords_max = ?');
      values.push(keywords_max);
    }

    if (keyword_rules !== undefined) {
      updates.push('keyword_rules = ?');
      values.push(JSON.stringify(keyword_rules));
    }

    if (export_format !== undefined) {
      updates.push('export_format = ?');
      values.push(export_format);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE presets SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('Preset name already exists'));
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        }
      );
    });

    // Return updated preset
    const updatedPreset = await new Promise<Preset>((resolve, reject) => {
      db.get(
        'SELECT * FROM presets WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as Preset);
        }
      );
    });

    res.json({
      ...updatedPreset,
      keyword_rules: JSON.parse(updatedPreset.keyword_rules)
    });

  } catch (error) {
    console.error('Update preset error:', error);
    if (error instanceof Error && error.message === 'Preset name already exists') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update preset' });
    }
  }
});

// DELETE /api/presets/:id - Delete preset
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if preset exists
    const existingPreset = await new Promise<Preset | null>((resolve, reject) => {
      db.get(
        'SELECT * FROM presets WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as Preset | null);
        }
      );
    });

    if (!existingPreset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM presets WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Preset deleted successfully' });

  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

export default router;