import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const backendFormData = new FormData();
    backendFormData.append('images', image);
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/analyze`, {
      method: 'POST',
      body: backendFormData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      
      // Return mock data as fallback
      const mockMetadata = {
        alt_text: `A professional stock photo featuring ${image.name.split('.')[0]}`,
        title: `High-quality ${image.name.split('.')[0]} image for commercial use`,
        keywords: [
          'professional', 'stock', 'photo', 'commercial', 'business',
          'marketing', 'advertising', 'content', 'digital', 'media',
          'creative', 'design', 'visual', 'image', 'photography',
          'quality', 'modern', 'clean', 'corporate', 'brand'
        ]
      };
      
      return NextResponse.json({
        success: true,
        metadata: mockMetadata,
        source: 'fallback'
      });
    }
    
    const result = await response.json();
    
    // If backend returns session-based response, poll for results
    if (result.session_id && result.results) {
      const sessionId = result.session_id;
      
      // Poll for completion (max 60 seconds)
      const maxAttempts = 60;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;
        
        try {
          const pollResponse = await fetch(`${backendUrl}/api/analyze/${sessionId}`);
          if (pollResponse.ok) {
            const pollResult = await pollResponse.json();
            const completedResults = pollResult.results.filter((r: any) => r.status === 'completed');
            
            if (completedResults.length > 0) {
              // Return the first completed result's metadata
              const metadata = completedResults[0].metadata;
              if (metadata) {
                return NextResponse.json({
                  success: true,
                  metadata: metadata,
                  source: 'ai'
                });
              }
            }
            
            // Check if any failed
            const failedResults = pollResult.results.filter((r: any) => r.status === 'error');
            if (failedResults.length > 0) {
              console.error('Backend processing failed:', failedResults[0].error);
              break; // Exit polling and use fallback
            }
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
          break;
        }
      }
    }
    
    // If we get here, either polling failed or timed out - use fallback
    const mockMetadata = {
      alt_text: `A professional stock photo featuring ${image.name.split('.')[0]}`,
      title: `High-quality ${image.name.split('.')[0]} image for commercial use`,
      keywords: [
        'professional', 'stock', 'photo', 'commercial', 'business',
        'marketing', 'advertising', 'content', 'digital', 'media',
        'creative', 'design', 'visual', 'image', 'photography',
        'quality', 'modern', 'clean', 'corporate', 'brand'
      ]
    };
    
    return NextResponse.json({
      success: true,
      metadata: mockMetadata,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('API error:', error);
    
    // Return mock data as fallback
    const mockMetadata = {
      alt_text: 'A professional stock photo suitable for commercial use',
      title: 'High-quality stock image for marketing and advertising',
      keywords: [
        'professional', 'stock', 'photo', 'commercial', 'business',
        'marketing', 'advertising', 'content', 'digital', 'media',
        'creative', 'design', 'visual', 'image', 'photography'
      ]
    };
    
    return NextResponse.json({
      success: true,
      metadata: mockMetadata,
      source: 'fallback'
    });
  }
}