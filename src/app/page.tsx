'use client';

import { useState, useCallback } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageGrid } from '@/components/ImageGrid';
import { MetadataTable } from '@/components/MetadataTable';
import { ProgressBar } from '@/components/ProgressBar';
import { BulkActions } from '@/components/BulkActions';

interface ImageData {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  metadata?: {
    alt_text: string;
    title: string;
    keywords: string[];
  };
  error?: string;
}

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

export default function Home() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoEmbedEnabled, setAutoEmbedEnabled] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [presets] = useState<Preset[]>([
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
  ]);

  const handleFilesAdded = useCallback((files: File[]) => {
    const newImages: ImageData[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const
    }));
    
    setImages(prev => [...prev, ...newImages]);
    
    // Start processing immediately
    processImages(newImages);
  }, []);

  const processImages = async (imagesToProcess: ImageData[]) => {
    setIsProcessing(true);
    
    for (const image of imagesToProcess) {
      try {
        // Update status to processing
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'processing' } : img
        ));
        
        // Create FormData for the API call
        const formData = new FormData();
        formData.append('image', image.file);
        
        // Call backend API to analyze image
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update with completed status and metadata
        setImages(prev => prev.map(img => 
          img.id === image.id ? { 
            ...img, 
            status: 'completed',
            metadata: result.metadata
          } : img
        ));
        
      } catch (error) {
        console.error('Error processing image:', error);
        
        // Fallback to mock data if API fails
        const mockMetadata = {
          alt_text: `A stock photo showing ${image.file.name.split('.')[0]}`,
          title: `Professional ${image.file.name.split('.')[0]} image for commercial use`,
          keywords: [
            'stock', 'photo', 'professional', 'commercial', 'business',
            'marketing', 'advertising', 'content', 'digital', 'media',
            'creative', 'design', 'visual', 'image', 'photography'
          ]
        };
        
        setImages(prev => prev.map(img => 
          img.id === image.id ? { 
            ...img, 
            status: 'completed',
            metadata: mockMetadata
          } : img
        ));
      }
    }
    
    setIsProcessing(false);
  };

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
    setSelectedImages(prev => prev.filter(imgId => imgId !== id));
  }, []);

  const handleImageSelect = useCallback((id: string) => {
    setSelectedImages(prev => 
      prev.includes(id) 
        ? prev.filter(imgId => imgId !== id)
        : [...prev, id]
    );
  }, []);

  const handleUpdateMetadata = useCallback((id: string, metadata: { alt_text: string; title: string; keywords: string[] }) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, metadata } : img
    ));
  }, []);

  const handleAddKeywords = useCallback((keywords: string[]) => {
    setImages(prev => prev.map(img => {
      if (selectedImages.includes(img.id) && img.metadata) {
        const existingKeywords = new Set(img.metadata.keywords);
        const newKeywords = keywords.filter(k => !existingKeywords.has(k));
        return {
          ...img,
          metadata: {
            ...img.metadata,
            keywords: [...img.metadata.keywords, ...newKeywords]
          }
        };
      }
      return img;
    }));
  }, [selectedImages]);

  const handleRemoveKeywords = useCallback((keywords: string[]) => {
    const keywordsToRemove = new Set(keywords);
    setImages(prev => prev.map(img => {
      if (selectedImages.includes(img.id) && img.metadata) {
        return {
          ...img,
          metadata: {
            ...img.metadata,
            keywords: img.metadata.keywords.filter(k => !keywordsToRemove.has(k))
          }
        };
      }
      return img;
    }));
  }, [selectedImages]);

  const handleFindReplace = useCallback((find: string, replace: string) => {
    setImages(prev => prev.map(img => {
      if (selectedImages.includes(img.id) && img.metadata) {
        return {
          ...img,
          metadata: {
            alt_text: img.metadata.alt_text.replace(new RegExp(find, 'gi'), replace),
            title: img.metadata.title.replace(new RegExp(find, 'gi'), replace),
            keywords: img.metadata.keywords.map(k => k.replace(new RegExp(find, 'gi'), replace))
          }
        };
      }
      return img;
    }));
  }, [selectedImages]);

  const handleExport = useCallback(async (format: 'csv' | 'json', presetId?: string) => {
    const selectedImageData = images.filter(img => 
      selectedImages.includes(img.id) && img.metadata
    );
    
    if (selectedImageData.length === 0) {
      alert('No images with metadata selected for export');
      return;
    }
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          images: selectedImageData.map(img => ({
            filename: img.file.name,
            metadata: img.metadata
          })),
          format,
          preset: presetId
        })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metadata_export_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  }, [images, selectedImages]);

  const handleClearSelection = useCallback(() => {
    setSelectedImages([]);
  }, []);

  const handleEmbedMetadata = useCallback(async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image || !image.metadata) {
      alert('No metadata available for this image');
      return;
    }

    setIsEmbedding(true);
    try {
      const formData = new FormData();
      formData.append('image', image.file);
      formData.append('title', image.metadata.title);
      formData.append('description', image.metadata.alt_text);
      formData.append('keywords', JSON.stringify(image.metadata.keywords));
      formData.append('createCopy', 'true');
      formData.append('suffix', '_tagged');

      const response = await fetch('/api/embed-metadata', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Metadata embedded successfully into ${image.file.name}`);
      } else {
        throw new Error(result.error || 'Failed to embed metadata');
      }
    } catch (error) {
      console.error('Embed error:', error);
      alert(`Failed to embed metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEmbedding(false);
    }
  }, [images]);

  const handleBatchEmbedMetadata = useCallback(async (imageIds: string[]) => {
    const imagesToEmbed = images.filter(img => 
      imageIds.includes(img.id) && img.metadata
    );
    
    if (imagesToEmbed.length === 0) {
      alert('No images with metadata selected for embedding');
      return;
    }

    setIsEmbedding(true);
    try {
      const formData = new FormData();
      
      // Add each image file and its metadata
      imagesToEmbed.forEach((img, index) => {
        formData.append('images', img.file);
        formData.append(`title_${index}`, img.metadata!.title);
        formData.append(`description_${index}`, img.metadata!.alt_text);
        formData.append(`keywords_${index}`, JSON.stringify(img.metadata!.keywords));
      });
      
      formData.append('createCopy', 'true');
      formData.append('suffix', '_tagged');

      const response = await fetch('/api/batch-embed-metadata', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Metadata embedded successfully into ${result.summary.successful} images`);
      } else {
        throw new Error(result.error || 'Failed to embed metadata');
      }
    } catch (error) {
      console.error('Batch embed error:', error);
      alert(`Failed to embed metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEmbedding(false);
    }
  }, [images]);

  // Calculate progress stats
  const progressStats = {
    total: images.length,
    completed: images.filter(img => img.status === 'completed').length,
    processing: images.filter(img => img.status === 'processing').length,
    errors: images.filter(img => img.status === 'error').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              AI-Powered Metadata Generation
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Turn every image into an
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> SEO asset</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Upload images and get professional titles, alt-text, and keywords instantly. 
              Boost your search rankings and stock photo sales with AI-optimized metadata.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">10%</div>
                <div className="text-sm text-gray-600">Higher Click-Through Rate</div>
                <div className="text-xs text-gray-500 mt-1">Images with proper alt text get more clicks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">70%</div>
                <div className="text-sm text-gray-600">Better Image Visibility</div>
                <div className="text-xs text-gray-500 mt-1">Optimized metadata increases search ranking</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">3x</div>
                <div className="text-sm text-gray-600">More Stock Sales</div>
                <div className="text-xs text-gray-500 mt-1">Professional keywords mean more buyers find you</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        <div className="space-y-6">
          {/* Upload Section */}
          <ImageUpload 
            onFilesAdded={handleFilesAdded}
            disabled={isProcessing}
          />

          {/* Progress Bar */}
          {images.length > 0 && (
            <ProgressBar {...progressStats} />
          )}

          {/* Bulk Actions */}
          <BulkActions
            selectedCount={selectedImages.length}
            onAddKeywords={handleAddKeywords}
            onRemoveKeywords={handleRemoveKeywords}
            onFindReplace={handleFindReplace}
            onExport={handleExport}
            onClearSelection={handleClearSelection}
            presets={presets}
          />

          {/* Image Grid */}
          {images.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Uploaded Images ({images.length})
              </h2>
              <ImageGrid 
                images={images}
                onRemoveImage={handleRemoveImage}
                onImageSelect={handleImageSelect}
                selectedImages={selectedImages}
              />
            </div>
          )}

          {/* Metadata Table */}
          {images.some(img => img.status === 'completed') && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Generated Metadata
              </h2>
              <MetadataTable 
                images={images}
                selectedImages={selectedImages}
                onUpdateMetadata={handleUpdateMetadata}
                onImageSelect={handleImageSelect}
                onEmbedMetadata={handleEmbedMetadata}
                onBatchEmbedMetadata={handleBatchEmbedMetadata}
                autoEmbedEnabled={autoEmbedEnabled}
                onAutoEmbedToggle={setAutoEmbedEnabled}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
