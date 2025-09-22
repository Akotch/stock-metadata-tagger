import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ImageMetadata, LMStudioConfig, OpenAIMessage } from '../types';

class LMStudioService {
  private config: LMStudioConfig;

  constructor() {
    this.config = {
      base_url: process.env.LM_BASE_URL || 'http://127.0.0.1:1234/v1',
      model: process.env.LM_MODEL || 'qwen2-vl',
      api_key: process.env.LM_API_KEY
    };
  }

  private encodeImageToBase64(imagePath: string): string {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this.getMimeType(imagePath);
    return `data:${mimeType};base64,${base64Image}`;
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  private createSystemPrompt(): string {
    return `You are an expert at analyzing stock photos and creating metadata for stock photography platforms.

Your task is to analyze the provided image and generate:
1. Alt text: A concise, descriptive alternative text (max 125 characters)
2. Title: A compelling, SEO-friendly title (max 70 characters)
3. Keywords: 15-25 relevant, unique keywords (singular nouns preferred)

Guidelines:
- Alt text should describe what's visible in the image objectively
- Title should be engaging and marketable
- Keywords should be specific, relevant, and help with discoverability
- Focus on: subjects, emotions, concepts, colors, composition, style
- Avoid: articles (a, an, the), duplicate keywords, overly generic terms

Respond ONLY with valid JSON in this exact format:
{
  "alt_text": "Description of the image",
  "title": "Compelling title for the image",
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}`;
  }

  async analyzeImage(imagePath: string): Promise<ImageMetadata> {
    try {
      const base64Image = this.encodeImageToBase64(imagePath);
      
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: this.createSystemPrompt()
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this image and provide metadata in the specified JSON format.'
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ];

      const response = await axios.post(
        `${this.config.base_url}/chat/completions`,
        {
          model: this.config.model,
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.api_key && { 'Authorization': `Bearer ${this.config.api_key}` })
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from LM Studio');
      }

      // Parse JSON response
      let metadata: ImageMetadata;
      try {
        // Clean up the response in case there's extra text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        metadata = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse LM Studio response:', content);
        throw new Error('Invalid JSON response from LM Studio');
      }

      // Validate and clean up the response
      return this.validateAndCleanMetadata(metadata);

    } catch (error) {
      console.error('LM Studio API error:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to LM Studio. Please ensure LM Studio is running and accessible.');
        }
        throw new Error(`LM Studio API error: ${error.message}`);
      }
      throw error;
    }
  }

  private validateAndCleanMetadata(metadata: any): ImageMetadata {
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Invalid metadata format');
    }

    // Validate alt_text
    let alt_text = metadata.alt_text || '';
    if (typeof alt_text !== 'string') {
      alt_text = String(alt_text);
    }
    alt_text = alt_text.trim().substring(0, 125);

    // Validate title
    let title = metadata.title || '';
    if (typeof title !== 'string') {
      title = String(title);
    }
    title = title.trim().substring(0, 70);

    // Validate keywords
    let keywords: string[] = [];
    if (Array.isArray(metadata.keywords)) {
      keywords = metadata.keywords
        .filter((k: any) => typeof k === 'string' && k.trim().length > 0)
        .map((k: any) => k.trim().toLowerCase())
        .filter((k: string, index: number, arr: string[]) => arr.indexOf(k) === index) // Remove duplicates
        .slice(0, 25); // Limit to 25 keywords
    }

    // Ensure minimum keywords
    if (keywords.length < 5) {
      throw new Error('Insufficient keywords generated. Please try again.');
    }

    return {
      alt_text,
      title,
      keywords
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.base_url}/models`, {
        timeout: 5000,
        headers: {
          ...(this.config.api_key && { 'Authorization': `Bearer ${this.config.api_key}` })
        }
      });
      return response.status === 200;
    } catch (error) {
      console.error('LM Studio connection test failed:', error);
      return false;
    }
  }
}

export default new LMStudioService();