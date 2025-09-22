export type AnalyzeResult = {
  alt_text: string;
  title: string;
  keywords: string[];
  raw?: unknown;
};

export interface ModelEndpoint {
  analyzeImage(args: {
    filePathOrBase64: string;
    prompt: string;
    model?: string;
  }): Promise<AnalyzeResult>;
  
  health(): Promise<{ ok: boolean; info?: string }>;
}

export interface OpenAIConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface CustomConfig {
  baseUrl: string;
}