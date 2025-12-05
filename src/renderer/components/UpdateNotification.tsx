import React, { useEffect, useState } from 'react';

interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export const UpdateNotification: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);

  useEffect(() => {
    // Listen for update events from main process
    const handleUpdateDownloading = () => {
      setIsDownloading(true);
    };

    const handleUpdateProgress = (_event: any, progressObj: UpdateProgress) => {
      setProgress(progressObj);
    };

    window.electronAPI.on('update-downloading', handleUpdateDownloading);
    window.electronAPI.on('update-progress', handleUpdateProgress);

    return () => {
      // Cleanup listeners if needed
    };
  }, []);

  if (!isDownloading) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-sm border border-gray-200 z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-blue-500 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">Downloading Update</h4>
          {progress && (
            <>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {progress.percent.toFixed(1)}% complete
                {progress.bytesPerSecond > 0 && (
                  <> • {(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s</>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
