import { ExifTool } from 'exiftool-vendored';
import * as path from 'path';
import * as fs from 'fs';

export interface MetadataFields {
  title: string;
  description: string;
  keywords: string[];
}

export interface EmbedOptions {
  createCopy?: boolean; // If true, creates _tagged copy instead of overwriting
  suffix?: string; // Custom suffix for copies (default: '_tagged')
}

export interface EmbedResult {
  success: boolean;
  filePath: string;
  originalPath?: string;
  error?: string;
  verificationData?: MetadataFields;
}

class MetadataEmbeddingService {
  private exiftool: ExifTool;

  constructor() {
    this.exiftool = new ExifTool({ taskTimeoutMillis: 30000 });
  }

  /**
   * Embed metadata into an image file using IPTC and XMP standards
   */
  async embedMetadata(
    filePath: string,
    metadata: MetadataFields,
    options: EmbedOptions = {}
  ): Promise<EmbedResult> {
    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          filePath,
          error: 'File not found'
        };
      }

      let targetPath = filePath;
      let originalPath: string | undefined;

      // Create copy if requested
      if (options.createCopy) {
        const suffix = options.suffix || '_tagged';
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        targetPath = path.join(dir, `${baseName}${suffix}${ext}`);
        
        // Copy original file
        fs.copyFileSync(filePath, targetPath);
        originalPath = filePath;
      }

      // Prepare metadata tags for ExifTool
      const tags = {
        // XMP Dublin Core fields
        'XMP-dc:Title': metadata.title,
        'XMP-dc:Description': metadata.description,
        'XMP-dc:Subject': metadata.keywords,
        
        // IPTC fields
        'IPTC:ObjectName': metadata.title,
        'IPTC:Caption-Abstract': metadata.description,
        'IPTC:Keywords': metadata.keywords,
        
        // Additional useful fields
        'XMP-photoshop:Headline': metadata.title,
        'IPTC:Headline': metadata.title
      };

      // Write metadata to file (using any type for custom tags)
      await this.exiftool.write(targetPath, tags as any);

      // Verify the metadata was written correctly
      const verificationData = await this.verifyMetadata(targetPath);

      return {
        success: true,
        filePath: targetPath,
        originalPath,
        verificationData
      };

    } catch (error) {
      return {
        success: false,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Verify metadata by reading it back from the file
   */
  async verifyMetadata(filePath: string): Promise<MetadataFields | undefined> {
    try {
      const tags = await this.exiftool.read(filePath);
      
      // Extract the metadata we wrote (using any type for dynamic tag access)
      const tagData = tags as any;
      const title = tagData['XMP-dc:Title'] || tagData['IPTC:ObjectName'] || '';
      const description = tagData['XMP-dc:Description'] || tagData['IPTC:Caption-Abstract'] || '';
      
      // Handle keywords (can be string or array)
      let keywords: string[] = [];
      const xmpKeywords = tagData['XMP-dc:Subject'];
      const iptcKeywords = tagData['IPTC:Keywords'];
      
      if (xmpKeywords) {
        keywords = Array.isArray(xmpKeywords) ? xmpKeywords : [xmpKeywords];
      } else if (iptcKeywords) {
        keywords = Array.isArray(iptcKeywords) ? iptcKeywords : [iptcKeywords];
      }

      return {
        title: String(title),
        description: String(description),
        keywords: keywords.map(k => String(k))
      };

    } catch (error) {
      console.error('Error verifying metadata:', error);
      return undefined;
    }
  }

  /**
   * Batch embed metadata into multiple files
   */
  async batchEmbedMetadata(
    files: Array<{ filePath: string; metadata: MetadataFields }>,
    options: EmbedOptions = {}
  ): Promise<EmbedResult[]> {
    const results: EmbedResult[] = [];
    
    for (const file of files) {
      const result = await this.embedMetadata(file.filePath, file.metadata, options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats(): string[] {
    return ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.heic', '.heif'];
  }

  /**
   * Check if file format is supported
   */
  isFormatSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.getSupportedFormats().includes(ext);
  }

  /**
   * Clean up ExifTool process
   */
  async cleanup(): Promise<void> {
    try {
      await this.exiftool.end();
    } catch (error) {
      console.error('Error cleaning up ExifTool:', error);
    }
  }
}

// Export singleton instance
export const metadataEmbeddingService = new MetadataEmbeddingService();

// Cleanup on process exit
process.on('exit', () => {
  metadataEmbeddingService.cleanup();
});

process.on('SIGINT', () => {
  metadataEmbeddingService.cleanup().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  metadataEmbeddingService.cleanup().then(() => process.exit(0));
});