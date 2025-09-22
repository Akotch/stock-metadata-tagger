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
  try {
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
  } catch (error) {
    // If validation fails, try to salvage what we can and add fallback data
    console.warn('Validation failed, attempting to fix result:', error);
    
    const fallbackKeywords = ['image', 'photo', 'visual', 'content', 'media'];
    
    // Ensure we have the required fields with fallbacks
    const altText = rawResult?.alt_text || rawResult?.description || 'Professional image';
    const title = rawResult?.title || rawResult?.caption || 'High-quality image';
    let keywords = Array.isArray(rawResult?.keywords) ? rawResult.keywords : [];
    
    // Pad keywords if insufficient
    if (keywords.length < 5) {
      keywords = [...keywords, ...fallbackKeywords].slice(0, 25);
    }
    
    // De-duplicate
    keywords = Array.from(new Set(keywords));
    
    // Ensure minimum requirements
    if (keywords.length < 5) {
      keywords = fallbackKeywords;
    }
    
    return {
      alt_text: altText.length >= 5 ? altText : `Professional ${altText}`,
      title: title.length >= 5 ? title : `High-quality ${title}`,
      keywords: keywords.slice(0, 25),
    };
  }
}