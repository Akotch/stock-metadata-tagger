'use client';

import { useState } from 'react';
import { Edit2, Save, X, AlertTriangle, CheckCircle, Download, FileImage } from 'lucide-react';

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

interface MetadataTableProps {
  images: ImageData[];
  selectedImages: string[];
  onUpdateMetadata: (id: string, metadata: { alt_text: string; title: string; keywords: string[] }) => void;
  onImageSelect: (id: string) => void;
  onEmbedMetadata?: (imageId: string) => void;
  onBatchEmbedMetadata?: (imageIds: string[]) => void;
  autoEmbedEnabled?: boolean;
  onAutoEmbedToggle?: (enabled: boolean) => void;
}

interface EditingState {
  [key: string]: {
    alt_text: string;
    title: string;
    keywords: string;
  };
}

export function MetadataTable({ 
  images, 
  selectedImages, 
  onUpdateMetadata, 
  onImageSelect, 
  onEmbedMetadata,
  onBatchEmbedMetadata,
  autoEmbedEnabled = false,
  onAutoEmbedToggle
}: MetadataTableProps) {
  const [editing, setEditing] = useState<EditingState>({});

  const startEditing = (image: ImageData) => {
    if (!image.metadata) return;
    
    setEditing(prev => ({
      ...prev,
      [image.id]: {
        alt_text: image.metadata!.alt_text,
        title: image.metadata!.title,
        keywords: image.metadata!.keywords.join(', ')
      }
    }));
  };

  const saveEditing = (imageId: string) => {
    const editData = editing[imageId];
    if (!editData) return;

    const keywords = editData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    onUpdateMetadata(imageId, {
      alt_text: editData.alt_text,
      title: editData.title,
      keywords
    });

    setEditing(prev => {
      const newState = { ...prev };
      delete newState[imageId];
      return newState;
    });
  };

  const cancelEditing = (imageId: string) => {
    setEditing(prev => {
      const newState = { ...prev };
      delete newState[imageId];
      return newState;
    });
  };

  const updateEditField = (imageId: string, field: string, value: string) => {
    setEditing(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        [field]: value
      }
    }));
  };

  const getValidationWarnings = (metadata: { alt_text: string; title: string; keywords: string[] }) => {
    const warnings = [];
    
    if (metadata.title.length > 70) {
      warnings.push('Title exceeds 70 characters');
    }
    
    if (metadata.keywords.length < 5) {
      warnings.push('Less than 5 keywords');
    } else if (metadata.keywords.length > 50) {
      warnings.push('More than 50 keywords');
    }
    
    return warnings;
  };

  const completedImages = images.filter(img => img.status === 'completed' && img.metadata);

  if (completedImages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
        <p>No processed images to display</p>
        <p className="text-sm mt-2">Upload and process some images to see their metadata here</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Metadata Overview</h2>
            <p className="text-gray-600 mt-1">
              {completedImages.length} image{completedImages.length !== 1 ? 's' : ''} • {selectedImages.length} selected
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {onAutoEmbedToggle && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoEmbedEnabled}
                  onChange={(e) => onAutoEmbedToggle(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  autoEmbedEnabled
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white border-gray-300 hover:border-blue-400'
                }`}>
                  {autoEmbedEnabled && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">Auto-embed IPTC/XMP</span>
              </label>
            )}
            {onBatchEmbedMetadata && selectedImages.length > 0 && (
              <button
                onClick={() => onBatchEmbedMetadata(selectedImages)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FileImage className="w-4 h-4" />
                <span className="text-sm font-medium">Embed Selected ({selectedImages.length})</span>
              </button>
            )}
            <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
              <span className="text-sm font-medium text-blue-700">
                {completedImages.length} AI Generated
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 text-left">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  completedImages.length > 0 && completedImages.every(img => selectedImages.includes(img.id))
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white border-gray-300 hover:border-blue-400'
                }`}>
                  <input
                    type="checkbox"
                    checked={completedImages.length > 0 && completedImages.every(img => selectedImages.includes(img.id))}
                    onChange={(e) => {
                      const allSelected = e.target.checked;
                      completedImages.forEach(img => {
                        if (allSelected && !selectedImages.includes(img.id)) {
                          onImageSelect(img.id);
                        } else if (!allSelected && selectedImages.includes(img.id)) {
                          onImageSelect(img.id);
                        }
                      });
                    }}
                    className="sr-only"
                  />
                  {completedImages.length > 0 && completedImages.every(img => selectedImages.includes(img.id)) && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Image</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Alt Text</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Keywords</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {completedImages.map((image) => {
              const isSelected = selectedImages.includes(image.id);
              const isEditing = editing[image.id];
              const metadata = image.metadata!;
              const warnings = getValidationWarnings(metadata);
              
              return (
                <tr key={image.id} className={`transition-all duration-200 ${isSelected ? 'bg-gradient-to-r from-blue-50 to-purple-50' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-6 py-4">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onImageSelect(image.id)}
                        className="sr-only"
                      />
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                     <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                       <img
                         src={image.preview}
                         alt={image.file.name}
                         className="w-full h-full object-cover"
                       />
                     </div>
                   </td>
                  
                  <td className="px-6 py-4 max-w-xs">
                    {isEditing ? (
                      <textarea
                        value={isEditing.alt_text}
                        onChange={(e) => updateEditField(image.id, 'alt_text', e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                    ) : (
                      <div className="text-sm text-gray-900 break-words p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                        {metadata.alt_text}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 max-w-xs">
                    {isEditing ? (
                      <input
                        type="text"
                        value={isEditing.title}
                        onChange={(e) => updateEditField(image.id, 'title', e.target.value)}
                        className={`w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing.title.length > 70 ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    ) : (
                      <div className={`text-sm break-words p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 ${
                        metadata.title.length > 70 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {metadata.title}
                        {metadata.title.length > 70 && (
                          <span className="text-xs text-red-500 block mt-1">
                            ({metadata.title.length}/70 chars)
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 max-w-sm">
                    {isEditing ? (
                      <textarea
                        value={isEditing.keywords}
                        onChange={(e) => updateEditField(image.id, 'keywords', e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Separate keywords with commas"
                      />
                    ) : (
                      <div className="text-sm p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                        <div className={`flex flex-wrap gap-1 ${
                          metadata.keywords.length < 15 || metadata.keywords.length > 25 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {metadata.keywords.slice(0, 5).map((keyword, idx) => (
                            <span key={idx} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 px-3 py-1 rounded-lg text-xs font-medium text-blue-700">
                              {keyword}
                            </span>
                          ))}
                          {metadata.keywords.length > 5 && (
                            <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded-lg">
                              +{metadata.keywords.length - 5} more
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {metadata.keywords.length} keywords
                        </div>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-200 ${
                      warnings.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
                    }`}>
                      {warnings.length > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" title={warnings.join(', ')} />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <span className={`text-xs font-medium ${
                        warnings.length > 0 ? 'text-yellow-700' : 'text-green-700'
                      }`}>
                        {warnings.length > 0 ? 'Issues' : 'Valid'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEditing(image.id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-colors duration-200 border border-green-200 hover:border-green-300"
                          title="Save changes"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => cancelEditing(image.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors duration-200 border border-gray-200 hover:border-gray-300"
                          title="Cancel editing"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(image)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors duration-200 border border-blue-200 hover:border-blue-300"
                          title="Edit metadata"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {onEmbedMetadata && (
                          <button
                            onClick={() => onEmbedMetadata(image.id)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-colors duration-200 border border-green-200 hover:border-green-300"
                            title="Save with metadata embedded"
                          >
                            <FileImage className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}