import { NextRequest, NextResponse } from 'next/server';

interface ExportRequest {
  images: Array<{
    filename: string;
    metadata: {
      alt_text: string;
      title: string;
      keywords: string[];
    };
  }>;
  format: 'csv' | 'json';
  preset?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { images, format, preset } = body;
    
    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided for export' },
        { status: 400 }
      );
    }

    // Try to forward to backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/api/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const blob = await response.blob();
        
        return new NextResponse(blob, {
          headers: {
            'Content-Type': contentType || (format === 'csv' ? 'text/csv' : 'application/json'),
            'Content-Disposition': `attachment; filename="metadata_export.${format}"`
          }
        });
      }
    } catch (backendError) {
      console.warn('Backend export failed, using fallback:', backendError);
    }
    
    // Fallback: generate export locally
    let content: string;
    let contentType: string;
    
    if (format === 'csv') {
      content = generateCSV(images, preset);
      contentType = 'text/csv';
    } else {
      content = JSON.stringify({
        export_date: new Date().toISOString(),
        preset: preset || 'default',
        total_images: images.length,
        images: images.map(img => ({
          filename: img.filename,
          alt_text: img.metadata.alt_text,
          title: img.metadata.title,
          keywords: img.metadata.keywords,
          keyword_count: img.metadata.keywords.length
        }))
      }, null, 2);
      contentType = 'application/json';
    }
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="metadata_export.${format}"`
      }
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

function generateCSV(images: ExportRequest['images'], preset?: string): string {
  // Shutterstock format based on the sample provided
  if (preset === 'shutterstock') {
    const headers = ['Filename', 'Description', 'Keywords', 'Categories', 'Editorial', 'Mature content', 'Illustration'];
    
    const rows = images.map(img => [
      escapeCSV(img.filename),
      escapeCSV(img.metadata.alt_text || img.metadata.title), // Use alt_text as description
      escapeCSV(img.metadata.keywords.join(',')), // Comma-separated keywords
      escapeCSV(''), // Categories - empty for user to fill
      escapeCSV('no'), // Editorial - default to 'no'
      escapeCSV('no'), // Mature content - default to 'no'
      escapeCSV('no')  // Illustration - default to 'no'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return csvContent;
  }
  
  // Default format for other presets
  const headers = ['Filename', 'Alt Text', 'Title', 'Keywords', 'Keyword Count'];
  
  const rows = images.map(img => [
    escapeCSV(img.filename),
    escapeCSV(img.metadata.alt_text),
    escapeCSV(img.metadata.title),
    escapeCSV(img.metadata.keywords.join(', ')),
    img.metadata.keywords.length.toString()
  ]);
  
  // Add preset-specific columns based on preset
  if (preset === 'adobe') {
    headers.push('Adobe Category', 'Adobe Releases');
    rows.forEach(row => {
      row.push('', ''); // Empty values for Adobe-specific fields
    });
  }
  
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  return csvContent;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}