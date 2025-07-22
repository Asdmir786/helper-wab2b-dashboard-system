/**
 * Download progress component
 * Animated progress indicator for update downloads
 */

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface DownloadProgressProps {
  progress: number;
  total: number;
  status?: 'downloading' | 'verifying' | 'installing';
  onCancel?: () => void;
}

export function DownloadProgress({
  progress,
  total,
  status = 'downloading',
  onCancel,
}: DownloadProgressProps): JSX.Element {
  const percentage = Math.round((progress / total) * 100);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Animation for the progress bar
  useEffect(() => {
    if (progressBarRef.current) {
      animate(progressBarRef.current, {
        width: `${percentage}%`,
        easing: 'easeOutQuad',
        duration: 300
      });
    }
  }, [percentage]);
  
  // Animation for the container when it mounts
  useEffect(() => {
    if (containerRef.current) {
      animate(containerRef.current, {
        translateY: [10, 0],
        opacity: [0, 1],
        easing: 'easeOutCubic',
        duration: 400
      });
    }
  }, []);
  
  // Get the status text and icon
  const statusInfo = getStatusInfo(status);
  
  return (
    <div 
      ref={containerRef}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md w-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {statusInfo.icon}
          <h3 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
            {statusInfo.text}
          </h3>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Cancel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      
      <div className="mt-2">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
          <div 
            ref={progressBarRef}
            className="bg-blue-500 h-2.5 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{formatBytes(progress)} / {formatBytes(total)}</span>
          <span>{percentage}%</span>
        </div>
      </div>
      
      {/* Optional additional information or actions */}
      {status === 'verifying' && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Verifying file integrity...
        </div>
      )}
      {status === 'installing' && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          The application will restart after installation.
        </div>
      )}
    </div>
  );
}

/**
 * Format bytes to a human-readable string
 * @param bytes Number of bytes
 * @returns Formatted string (e.g., "1.23 MB")
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get status text and icon based on the current status
 * @param status Current status
 * @returns Object with text and icon
 */
function getStatusInfo(status: 'downloading' | 'verifying' | 'installing') {
  switch (status) {
    case 'downloading':
      return {
        text: 'Downloading Update',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        )
      };
    case 'verifying':
      return {
        text: 'Verifying Update',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        )
      };
    case 'installing':
      return {
        text: 'Installing Update',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
          </svg>
        )
      };
  }
}