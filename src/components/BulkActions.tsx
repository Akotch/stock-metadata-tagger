'use client';

import { useState } from 'react';
import { Plus, Minus, Search, Replace, Download, Settings } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onAddKeywords: (keywords: string[]) => void;
  onRemoveKeywords: (keywords: string[]) => void;
  onFindReplace: (find: string, replace: string) => void;
  onExport: (format: 'csv' | 'json', preset?: string) => void;
  onClearSelection: () => void;
  presets: Array<{ id: string; name: string }>;
}

export function BulkActions({ 
  selectedCount, 
  onAddKeywords, 
  onRemoveKeywords, 
  onFindReplace, 
  onExport, 
  onClearSelection,
  presets 
}: BulkActionsProps) {
  const [showAddKeywords, setShowAddKeywords] = useState(false);
  const [showRemoveKeywords, setShowRemoveKeywords] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showExport, setShowExport] = useState(false);
  
  const [addKeywordsText, setAddKeywordsText] = useState('');
  const [removeKeywordsText, setRemoveKeywordsText] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportPreset, setExportPreset] = useState('');

  const handleAddKeywords = () => {
    const keywords = addKeywordsText
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    if (keywords.length > 0) {
      onAddKeywords(keywords);
      setAddKeywordsText('');
      setShowAddKeywords(false);
    }
  };

  const handleRemoveKeywords = () => {
    const keywords = removeKeywordsText
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    if (keywords.length > 0) {
      onRemoveKeywords(keywords);
      setRemoveKeywordsText('');
      setShowRemoveKeywords(false);
    }
  };

  const handleFindReplace = () => {
    if (findText.trim()) {
      onFindReplace(findText.trim(), replaceText.trim());
      setFindText('');
      setReplaceText('');
      setShowFindReplace(false);
    }
  };

  const handleExport = () => {
    onExport(exportFormat, exportPreset || undefined);
    setShowExport(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Bulk Actions
            </h3>
            <p className="text-sm text-gray-600">
              {selectedCount} image{selectedCount !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>
        <button
          onClick={onClearSelection}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors duration-200"
        >
          Clear selection
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <button
          onClick={() => setShowAddKeywords(!showAddKeywords)}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Add Keywords
        </button>
        
        <button
          onClick={() => setShowRemoveKeywords(!showRemoveKeywords)}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Minus className="w-5 h-5" />
          Remove Keywords
        </button>
        
        <button
          onClick={() => setShowFindReplace(!showFindReplace)}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Replace className="w-5 h-5" />
          Find & Replace
        </button>
        
        <button
          onClick={() => setShowExport(!showExport)}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Add Keywords Panel */}
      {showAddKeywords && (
        <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
          <h4 className="text-lg font-semibold text-green-800 mb-4">Add Keywords to Selected Images</h4>
          <div className="flex gap-3">
            <input
              type="text"
              value={addKeywordsText}
              onChange={(e) => setAddKeywordsText(e.target.value)}
              placeholder="Enter keywords separated by commas (e.g., nature, landscape, sunset)"
              className="flex-1 px-4 py-3 border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleAddKeywords()}
            />
            <button
              onClick={handleAddKeywords}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium transition-all duration-200 transform hover:scale-105"
            >
              Add Keywords
            </button>
          </div>
        </div>
      )}

      {/* Remove Keywords Panel */}
      {showRemoveKeywords && (
        <div className="mt-6 p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-100">
          <h4 className="text-lg font-semibold text-red-800 mb-4">Remove Keywords from Selected Images</h4>
          <div className="flex gap-3">
            <input
              type="text"
              value={removeKeywordsText}
              onChange={(e) => setRemoveKeywordsText(e.target.value)}
              placeholder="Enter keywords to remove, separated by commas (e.g., old, outdated)"
              className="flex-1 px-4 py-3 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleRemoveKeywords()}
            />
            <button
              onClick={handleRemoveKeywords}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 text-sm font-medium transition-all duration-200 transform hover:scale-105"
            >
              Remove Keywords
            </button>
          </div>
        </div>
      )}

      {/* Find & Replace Panel */}
      {showFindReplace && (
        <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
          <h4 className="text-lg font-semibold text-blue-800 mb-4">Find & Replace in Keywords</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find text (e.g., old keyword)"
              className="px-4 py-3 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with (e.g., new keyword)"
              className="px-4 py-3 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            />
            <button
              onClick={handleFindReplace}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium transition-all duration-200 transform hover:scale-105"
            >
              Replace All
            </button>
          </div>
        </div>
      )}

      {/* Export Panel */}
      {showExport && (
        <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-100">
          <h4 className="text-lg font-semibold text-black mb-4">Export Selected Images</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
              className="px-4 py-3 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            >
              <option value="csv">CSV Format</option>
              <option value="json">JSON Format</option>
            </select>
            
            <select
              value={exportPreset}
              onChange={(e) => setExportPreset(e.target.value)}
              className="px-4 py-3 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            >
              <option value="">Default format</option>
              {presets.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            
            <div className="md:col-span-2">
              <button
                onClick={handleExport}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 text-sm font-medium transition-all duration-200 transform hover:scale-105"
              >
                Export {selectedCount} image{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}