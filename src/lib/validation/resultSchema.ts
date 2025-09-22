import { z } from "zod";

export const ResultSchema = z.object({
  alt_text: z.string().min(5).max(160),
  title: z.string().min(5),
  keywords: z.array(z.string()).min(5).max(50),
});

export type ValidatedResult = z.infer<typeof ResultSchema>;

/**
 * Process and validate the result from model endpoints
 */
export function processResult(rawResult: any): ValidatedResult {
  // Parse and validate with Zod
  const validated = ResultSchema.parse(rawResult);
  
  // Trim title to ≤70 chars
  const processedTitle = validated.title.length > 70 
    ? validated.title.substring(0, 70).trim() 
    : validated.title;
  
  // De-duplicate keywords and keep top 25
  const uniqueKeywords = Array.from(new Set(validated.keywords));
  const processedKeywords = uniqueKeywords.slice(0, 25);
  
  return {
    alt_text: validated.alt_text,
    title: processedTitle,
    keywords: processedKeywords,
  };
}