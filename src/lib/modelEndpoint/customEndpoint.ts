import { ModelEndpoint, AnalyzeResult, CustomConfig } from './types';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { withRetry } from '../utils/retry';
import { processResult } from '../validation/resultSchema';
import * as fs from 'fs';
import * as path from 'path';

export class CustomBackendEndpoint implements ModelEndpoint {
  private config: CustomConfig;
  private timeoutMs: number;
  private retries: number;

  constructor(baseUrl: string) {
    this.config = { baseUrl };
    this.timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '60000');
    this.retries = parseInt(process.env.REQUEST_RETRIES || '2');
  }

  async analyzeImage(args: {
    filePathOrBase64: string;
    prompt: string;
    model?: string;
  }): Promise<AnalyzeResult> {
    const { filePathOrBase64, prompt } = args;
    
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
      imageBase64: base64Data,
      prompt: prompt
    };

    const makeRequest = async () => {
      const response = await fetchWithTimeout(
        `${this.config.baseUrl}/api/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        this.timeoutMs
      );

      if (!response.ok) {
        throw new Error(`Custom backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate that the response has the expected structure
      if (!data.alt_text || !data.title || !data.keywords) {
        throw new Error('Invalid response format from custom backend');
      }

      // Validate and process the result
      const validatedResult = processResult(data);
      
      return {
        ...validatedResult,
        raw: data
      };
    };

    return withRetry(makeRequest, this.retries);
  }

  async health(): Promise<{ ok: boolean; info?: string }> {
    try {
      const response = await fetchWithTimeout(
        `${this.config.baseUrl}/healthz`,
        { method: 'GET' },
        5000 // 5 second timeout for health check
      );

      if (response.ok) {
        const data = await response.text();
        return {
          ok: true,
          info: `Connected to custom backend. Response: ${data}`
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