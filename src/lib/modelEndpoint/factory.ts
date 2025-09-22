import { ModelEndpoint } from "./types";
import { OpenAICompatibleEndpoint } from "./openaiEndpoint";
import { CustomBackendEndpoint } from "./customEndpoint";

export function createModelEndpoint(): ModelEndpoint {
  const mode = process.env.MODEL_ENDPOINT_MODE ?? "openai"; // "openai" | "custom"
  
  if (mode === "custom") {
    const backendBase = process.env.BACKEND_BASE;
    if (!backendBase) {
      throw new Error("BACKEND_BASE environment variable is required for custom mode");
    }
    return new CustomBackendEndpoint(backendBase);
  } else {
    // Default to OpenAI-compatible mode
    const baseUrl = process.env.LM_BASE;
    const model = process.env.LM_MODEL;
    const apiKey = process.env.LM_API_KEY ?? "";
    
    if (!baseUrl) {
      throw new Error("LM_BASE environment variable is required for openai mode");
    }
    if (!model) {
      throw new Error("LM_MODEL environment variable is required for openai mode");
    }
    
    return new OpenAICompatibleEndpoint({
      baseUrl,
      model,
      apiKey
    });
  }
}

// Export a singleton instance for convenience
let _instance: ModelEndpoint | null = null;

export function getModelEndpoint(): ModelEndpoint {
  if (!_instance) {
    _instance = createModelEndpoint();
  }
  return _instance;
}

// Reset the singleton (useful for testing or config changes)
export function resetModelEndpoint(): void {
  _instance = null;
}