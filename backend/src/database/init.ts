import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/metadata_assistant.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new sqlite3.Database(DB_PATH);

export async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Images table
      db.run(`
        CREATE TABLE IF NOT EXISTS images (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          alt_text TEXT,
          title TEXT,
          keywords TEXT, -- JSON array as string
          status TEXT DEFAULT 'pending', -- pending, processing, completed, error
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        )
      `);

      // Presets table
      db.run(`
        CREATE TABLE IF NOT EXISTS presets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          title_max_length INTEGER DEFAULT 70,
          keywords_min INTEGER DEFAULT 15,
          keywords_max INTEGER DEFAULT 25,
          keyword_rules TEXT, -- JSON object as string
          export_format TEXT, -- csv, json
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert default presets
      const defaultPresets = [
        {
          id: 'adobe-stock',
          name: 'Adobe Stock',
          description: 'Optimized for Adobe Stock submissions',
          title_max_length: 70,
          keywords_min: 15,
          keywords_max: 25,
          keyword_rules: JSON.stringify({
            singular_nouns: true,
            no_duplicates: true,
            relevant_only: true
          }),
          export_format: 'csv'
        },
        {
          id: 'shutterstock',
          name: 'Shutterstock',
          description: 'Optimized for Shutterstock submissions',
          title_max_length: 70,
          keywords_min: 15,
          keywords_max: 25,
          keyword_rules: JSON.stringify({
            singular_nouns: true,
            no_duplicates: true,
            relevant_only: true
          }),
          export_format: 'csv'
        },
        {
          id: 'generic-seo',
          name: 'Generic SEO',
          description: 'General SEO optimization',
          title_max_length: 60,
          keywords_min: 10,
          keywords_max: 20,
          keyword_rules: JSON.stringify({
            singular_nouns: false,
            no_duplicates: true,
            relevant_only: true
          }),
          export_format: 'json'
        }
      ];

      const insertPreset = db.prepare(`
        INSERT OR IGNORE INTO presets 
        (id, name, description, title_max_length, keywords_min, keywords_max, keyword_rules, export_format)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      defaultPresets.forEach(preset => {
        insertPreset.run(
          preset.id,
          preset.name,
          preset.description,
          preset.title_max_length,
          preset.keywords_min,
          preset.keywords_max,
          preset.keyword_rules,
          preset.export_format
        );
      });

      insertPreset.finalize();

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_images_session_id ON images(session_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_images_status ON images(status)');
      
      resolve();
    });

    db.on('error', (err) => {
      reject(err);
    });
  });
}

export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}