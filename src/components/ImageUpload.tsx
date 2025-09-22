'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onFilesAdded: (files: File[]) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function ImageUpload({ onFilesAdded, compact = false, disabled = false }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      console.warn('Some files were rejected:', rejectedFiles);
    }
    
    if (acceptedFiles.length > 0) {
      onFilesAdded(acceptedFiles);
    }
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled
  });

  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50' : ''}
          ${isDragReject ? 'border-red-400 bg-red-50' : ''}
          ${!isDragActive && !isDragReject ? 'border-gray-300 hover:border-gray-400' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Upload className="w-4 h-4" />
          {isDragActive ? (
            isDragReject ? (
              <span className="text-red-600">Invalid file type</span>
            ) : (
              <span className="text-blue-600">Drop images here</span>
            )
          ) : (
            <span>Add more images</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 group
          ${isDragActive 
            ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 scale-[1.02] shadow-lg' 
            : 'border-gray-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
          bg-white/80 backdrop-blur-sm
        `}
      >
        <input {...getInputProps()} disabled={disabled} />
        
        <div className="flex flex-col items-center space-y-6">
          <div className={`p-4 rounded-2xl transition-all duration-300 ${
            isDragActive 
              ? 'bg-blue-100 text-blue-600 scale-110' 
              : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 group-hover:from-blue-100 group-hover:to-blue-200 group-hover:text-blue-600'
          }`}>
            <Upload className="w-10 h-10" />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {isDragActive ? 'Drop your images here' : 'Upload Images for AI Analysis'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
              {isDragActive 
                ? 'Release to start generating professional metadata'
                : 'Drag and drop your images or click to browse. Our AI will generate SEO-optimized titles, alt-text, and keywords instantly.'
              }
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>JPEG, PNG, WebP</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Max 10MB per file</span>
              </div>
            </div>
          </div>
          
          {!isDragActive && (
            <button
              type="button"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={disabled}
            >
              <span className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Choose Files</span>
              </span>
            </button>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 opacity-20">
          <div className="w-8 h-8 border-2 border-blue-300 rounded-full"></div>
        </div>
        <div className="absolute bottom-4 left-4 opacity-20">
          <div className="w-6 h-6 border-2 border-purple-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}