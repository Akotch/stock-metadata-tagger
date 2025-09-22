import { Router, Request, Response } from 'express';
import multer from 'multer';
import { metadataEmbeddingService, MetadataFields, EmbedOptions } from '../services/metadataEmbedding';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const uploadSingle = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file for embed endpoint
  },
  fileFilter
});

const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 50 // Multiple files for batch endpoint
  },
  fileFilter
});

interface EmbedRequest {
  filePath: string;
  title: string;
  description: string;
  keywords: string[];
  createCopy?: boolean;
  suffix?: string;
}

interface BatchEmbedRequest {
  files: Array<{
    filePath: string;
    title: string;
    description: string;
    keywords: string[];
  }>;
  createCopy?: boolean;
  suffix?: string;
}

/**
 * POST /api/embed-metadata
 * Embed metadata into a single image file
 */
router.post('/embed-metadata', uploadSingle.single('image'), async (req: Request, res: Response) => {
  try {
    const { title, description, keywords, createCopy, suffix } = req.body;
    const uploadedFile = req.file;

    // Validate uploaded file
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description'
      });
    }

    // Parse keywords (they come as string from form data)
    let parsedKeywords: string[] = [];
    if (keywords) {
      try {
        parsedKeywords = typeof keywords === 'string' ? JSON.parse(keywords) : keywords;
      } catch (e) {
        parsedKeywords = typeof keywords === 'string' ? [keywords] : keywords;
      }
    }

    // Check if file format is supported
    if (!metadataEmbeddingService.isFormatSupported(uploadedFile.path)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file format. Supported formats: ${metadataEmbeddingService.getSupportedFormats().join(', ')}`
      });
    }

    const metadata: MetadataFields = {
      title: title.trim(),
      description: description.trim(),
      keywords: parsedKeywords.map(k => k.trim()).filter(k => k.length > 0)
    };

    const options: EmbedOptions = {
      createCopy: createCopy === 'true' || createCopy === true,
      suffix: suffix || '_tagged'
    };

    const result = await metadataEmbeddingService.embedMetadata(uploadedFile.path, metadata, options);

    if (result.success) {
      res.json({
        success: true,
        message: 'Metadata embedded successfully',
        filePath: result.filePath,
        originalPath: result.originalPath,
        verificationData: result.verificationData
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to embed metadata'
      });
    }

  } catch (error) {
    console.error('Error in embed-metadata endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/batch-embed-metadata
 * Embed metadata into multiple image files
 */
router.post('/batch-embed-metadata', uploadMultiple.array('images', 50), async (req: Request, res: Response) => {
  try {
    const { createCopy, suffix } = req.body;
    const uploadedFiles = req.files as Express.Multer.File[];

    // Validate uploaded files
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image files uploaded'
      });
    }

    // Parse metadata for each file (sent as JSON strings)
    const processFiles = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const title = req.body[`title_${i}`];
      const description = req.body[`description_${i}`];
      const keywords = req.body[`keywords_${i}`];

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: `Missing metadata for file ${file.originalname}`
        });
      }

      // Parse keywords
      let parsedKeywords: string[] = [];
      if (keywords) {
        try {
          parsedKeywords = typeof keywords === 'string' ? JSON.parse(keywords) : keywords;
        } catch (e) {
          parsedKeywords = typeof keywords === 'string' ? [keywords] : keywords;
        }
      }

      // Check if file format is supported
      if (!metadataEmbeddingService.isFormatSupported(file.path)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported file format for ${file.originalname}. Supported formats: ${metadataEmbeddingService.getSupportedFormats().join(', ')}`
        });
      }

      processFiles.push({
        filePath: file.path,
        metadata: {
          title: title.trim(),
          description: description.trim(),
          keywords: parsedKeywords.map(k => k.trim()).filter(k => k.length > 0)
        }
      });
    }

    const options: EmbedOptions = {
      createCopy: createCopy === 'true' || createCopy === true,
      suffix: suffix || '_tagged'
    };

    const results = await metadataEmbeddingService.batchEmbedMetadata(processFiles, options);

    // Count successes and failures
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Batch embedding completed: ${successful} successful, ${failed} failed`,
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Error in batch-embed-metadata endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/verify-metadata
 * Verify metadata in an image file
 */
router.post('/verify-metadata', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'filePath is required'
      });
    }

    // Validate file path security
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..') || !path.isAbsolute(normalizedPath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const metadata = await metadataEmbeddingService.verifyMetadata(filePath);

    if (metadata) {
      res.json({
        success: true,
        metadata
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to read metadata'
      });
    }

  } catch (error) {
    console.error('Error in verify-metadata endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/supported-formats
 * Get list of supported image formats
 */
router.get('/supported-formats', (req: Request, res: Response) => {
  try {
    const formats = metadataEmbeddingService.getSupportedFormats();
    res.json({
      success: true,
      formats
    });
  } catch (error) {
    console.error('Error in supported-formats endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;