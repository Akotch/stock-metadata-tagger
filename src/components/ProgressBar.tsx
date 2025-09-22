'use client';

interface ProgressBarProps {
  total: number;
  completed: number;
  processing: number;
  errors: number;
  className?: string;
}

export function ProgressBar({ total, completed, processing, errors, className = '' }: ProgressBarProps) {
  if (total === 0) {
    return null;
  }

  const completedPercent = (completed / total) * 100;
  const processingPercent = (processing / total) * 100;
  const errorPercent = (errors / total) * 100;
  const pendingPercent = 100 - completedPercent - processingPercent - errorPercent;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Processing Progress</h3>
        <span className="text-sm text-gray-500">
          {completed + processing + errors} / {total} images
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className="h-full flex">
          {/* Completed */}
          {completedPercent > 0 && (
            <div 
              className="bg-green-500 transition-all duration-300"
              style={{ width: `${completedPercent}%` }}
            />
          )}
          
          {/* Processing */}
          {processingPercent > 0 && (
            <div 
              className="bg-blue-500 transition-all duration-300 animate-pulse"
              style={{ width: `${processingPercent}%` }}
            />
          )}
          
          {/* Errors */}
          {errorPercent > 0 && (
            <div 
              className="bg-red-500 transition-all duration-300"
              style={{ width: `${errorPercent}%` }}
            />
          )}
          
          {/* Pending */}
          {pendingPercent > 0 && (
            <div 
              className="bg-gray-300 transition-all duration-300"
              style={{ width: `${pendingPercent}%` }}
            />
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          {completed > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{completed} completed</span>
            </div>
          )}
          
          {processing > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>{processing} processing</span>
            </div>
          )}
          
          {errors > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{errors} errors</span>
            </div>
          )}
          
          {total - completed - processing - errors > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>{total - completed - processing - errors} pending</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          {processing > 0 ? (
            <span className="text-blue-600">Processing...</span>
          ) : completed === total ? (
            <span className="text-green-600">All complete!</span>
          ) : errors > 0 && processing === 0 ? (
            <span className="text-red-600">Some errors occurred</span>
          ) : (
            <span>Ready to process</span>
          )}
        </div>
      </div>
    </div>
  );
}