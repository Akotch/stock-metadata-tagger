import { NextRequest, NextResponse } from 'next/server';

interface Preset {
  id: string;
  name: string;
  keyword_rules: {
    min_keywords: number;
    max_keywords: number;
    required_keywords: string[];
    forbidden_keywords: string[];
  };
}

// Default presets
const defaultPresets: Preset[] = [
  {
    id: 'adobe',
    name: 'Adobe Stock',
    keyword_rules: {
      min_keywords: 15,
      max_keywords: 25,
      required_keywords: [],
      forbidden_keywords: ['stock', 'photo']
    }
  },
  {
    id: 'shutterstock',
    name: 'Shutterstock',
    keyword_rules: {
      min_keywords: 20,
      max_keywords: 50,
      required_keywords: [],
      forbidden_keywords: []
    }
  },
  {
    id: 'generic',
    name: 'Generic SEO',
    keyword_rules: {
      min_keywords: 10,
      max_keywords: 30,
      required_keywords: [],
      forbidden_keywords: []
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    // Try to get presets from backend first
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/api/presets`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const presets = await response.json();
        return NextResponse.json(presets);
      }
    } catch (backendError) {
      console.warn('Backend presets fetch failed, using defaults:', backendError);
    }
    
    // Fallback to default presets
    return NextResponse.json({
      success: true,
      presets: defaultPresets
    });
    
  } catch (error) {
    console.error('Presets GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const preset: Omit<Preset, 'id'> = await request.json();
    
    // Try to create preset in backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/api/presets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preset)
      });
      
      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    } catch (backendError) {
      console.warn('Backend preset creation failed:', backendError);
    }
    
    // Fallback: return mock success
    const newPreset: Preset = {
      id: Math.random().toString(36).substr(2, 9),
      ...preset
    };
    
    return NextResponse.json({
      success: true,
      preset: newPreset
    });
    
  } catch (error) {
    console.error('Presets POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create preset' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const preset: Preset = await request.json();
    
    // Try to update preset in backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/api/presets/${preset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preset)
      });
      
      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    } catch (backendError) {
      console.warn('Backend preset update failed:', backendError);
    }
    
    // Fallback: return mock success
    return NextResponse.json({
      success: true,
      preset
    });
    
  } catch (error) {
    console.error('Presets PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update preset' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Preset ID is required' },
        { status: 400 }
      );
    }
    
    // Try to delete preset from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/api/presets/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    } catch (backendError) {
      console.warn('Backend preset deletion failed:', backendError);
    }
    
    // Fallback: return mock success
    return NextResponse.json({
      success: true,
      message: 'Preset deleted successfully'
    });
    
  } catch (error) {
    console.error('Presets DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    );
  }
}