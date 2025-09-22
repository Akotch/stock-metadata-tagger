'use client';

import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, X, Eye } from 'lucide-react';

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

interface ImageGridProps {
  images: ImageData[];
  onRemoveImage: (id: string) => void;
  onImageSelect: (id: string) => void;
  selectedImages: string[];
}

export function ImageGrid({ images, onRemoveImage, onImageSelect, selectedImages }: ImageGridProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getStatusIcon = (status: ImageData['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ImageData['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No images uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image) => {
          const isSelected = selectedImages.includes(image.id);
          
          return (
            <div
              key={image.id}
              className={`
                relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group cursor-pointer
                ${isSelected ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02]' : ''}
              `}
              onClick={() => onImageSelect(image.id)}
            >
              {/* Selection checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white/90 border-gray-300 hover:border-blue-400 backdrop-blur-sm'
                }`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onImageSelect(image.id)}
                    className="sr-only"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(image.id);
                }}
                className="absolute top-3 right-3 z-10 w-8 h-8 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Preview button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(image.preview);
                }}
                className="absolute bottom-3 right-3 z-10 w-8 h-8 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-all duration-200 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img
                  src={image.preview}
                  alt={image.metadata?.title || image.file.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Processing overlay */}
                {image.status === 'processing' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-white text-center">
                      <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm font-medium">Analyzing with AI...</p>
                      <p className="text-xs opacity-80 mt-1">Generating metadata</p>
                    </div>
                  </div>
                )}
                
                {/* Error overlay */}
                {image.status === 'error' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/80 to-red-600/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-white text-center">
                      <AlertCircle className="w-10 h-10 mx-auto mb-3" />
                      <p className="text-sm font-medium">Processing Failed</p>
                      <p className="text-xs opacity-80 mt-1">Click to retry</p>
                    </div>
                  </div>
                )}
                
                {/* Success indicator */}
                {image.status === 'completed' && image.metadata && (
                  <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    ✓ AI Generated
                  </div>
                )}
              </div>

              {/* Metadata preview */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 truncate text-sm leading-tight">
                    {image.metadata?.title || image.file.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">{(image.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="text-xs text-gray-500">{image.file.type.split('/')[1].toUpperCase()}</span>
                  </div>
                </div>
                
                {image.status === 'error' && image.error && (
                  <div className="text-xs text-red-600 truncate" title={image.error}>
                    {image.error}
                  </div>
                )}
                
                {image.metadata?.keywords && (
                  <div className="flex flex-wrap gap-1.5">
                    {image.metadata.keywords.slice(0, 3).map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 text-xs rounded-lg font-medium border border-blue-100"
                      >
                        {keyword}
                      </span>
                    ))}
                    {image.metadata.keywords.length > 3 && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
                        +{image.metadata.keywords.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
                {!image.metadata && image.status === 'pending' && (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-400">Ready for AI analysis</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}