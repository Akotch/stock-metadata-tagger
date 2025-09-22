import { ModelEndpoint, AnalyzeResult, OpenAIConfig } from './types';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { withRetry } from '../utils/retry';
import { processResult } from '../validation/resultSchema';
import * as fs from 'fs';
import * as path from 'path';

export class OpenAICompatibleEndpoint implements ModelEndpoint {
  private config: OpenAIConfig;
  private timeoutMs: number;
  private retries: number;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '60000');
    this.retries = parseInt(process.env.REQUEST_RETRIES || '2');
  }

  async analyzeImage(args: {
    filePathOrBase64: string;
    prompt: string;
    model?: string;
  }): Promise<AnalyzeResult> {
    const { filePathOrBase64, prompt, model } = args;
    
    // Convert file path to base64 if needed
    let base64Data: string;
    if (filePathOrBase64.startsWith('data:') || filePathOrBase64.match(/^[A-Za-z0-9+/=]+$/)) {
      // Already base64 or data URL
      base64Data = filePathOrBase64.replace(/^data:image\/[^;]+;base64,/, '');
    } else {
      // File path - read and convert to base64
      const fileBuffer = fs.readFileSync(filePathOrBase64);
      base64Data = fileBuffer.toString('base64');
    }

    const requestBody = {
      model: model || this.config.model,
      messages: [
        {
          role: "system",
          content: "You are a stock-metadata editor. Return strict JSON with alt_text,title,keywords."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { url: `data:image/jpeg;base64,${base64Data}` }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 512
    };

    const makeRequest = async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetchWithTimeout(
        `${this.config.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        },
        this.timeoutMs
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse JSON from the content (handle markdown code blocks)
      let parsedContent;
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanContent = content.trim();
        
        // Remove markdown code blocks
        if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
          cleanContent = cleanContent.slice(7, -3).trim();
        } else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
          cleanContent = cleanContent.slice(3, -3).trim();
        }
        
        // Try to extract JSON if there's extra text
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
        }
        
        parsedContent = JSON.parse(cleanContent);
      } catch (error) {
        throw new Error(`Failed to parse JSON from model response: ${content}`);
      }

      // Validate and process the result
      const validatedResult = processResult(parsedContent);
      
      return {
        ...validatedResult,
        raw: data
      };
    };

    return withRetry(makeRequest, this.retries);
  }

  async health(): Promise<{ ok: boolean; info?: string }> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetchWithTimeout(
        `${this.config.baseUrl}/models`,
        { headers },
        5000 // 5 second timeout for health check
      );

      if (response.ok) {
        const data = await response.json() as any;
        return {
          ok: true,
          info: `Connected to OpenAI-compatible endpoint. Available models: ${data.data?.length || 0}`
        };
      } else {
        return {
          ok: false,
          info: `Health check failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        ok: false,
        info: `Health check error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}