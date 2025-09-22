export interface ImageMetadata {
  alt_text: string;
  title: string;
  keywords: string[];
}

export interface ImageRecord {
  id: string;
  session_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  title?: string;
  keywords?: string; // JSON string
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  title_max_length: number;
  keywords_min: number;
  keywords_max: number;
  keyword_rules: string; // JSON string
  export_format: 'csv' | 'json';
  created_at: string;
  updated_at: string;
}

export interface KeywordRules {
  singular_nouns: boolean;
  no_duplicates: boolean;
  relevant_only: boolean;
}

export interface AnalyzeRequest {
  session_id?: string;
  session_name?: string;
  preset_id?: string;
}

export interface AnalyzeResponse {
  session_id: string;
  results: ImageAnalysisResult[];
}

export interface ImageAnalysisResult {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  metadata?: ImageMetadata;
  error?: string;
  validation_warnings?: string[];
}

export interface BulkEditRequest {
  image_ids: string[];
  operation: 'add_keywords' | 'remove_keywords' | 'find_replace';
  keywords?: string[];
  find_text?: string;
  replace_text?: string;
  field?: 'title' | 'alt_text' | 'keywords';
}

export interface ExportRequest {
  session_id: string;
  preset_id: string;
  format: 'csv' | 'json';
  image_ids?: string[]; // If not provided, export all images in session
}

export interface ValidationResult {
  is_valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface LMStudioConfig {
  base_url: string;
  model: string;
  api_key?: string;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}