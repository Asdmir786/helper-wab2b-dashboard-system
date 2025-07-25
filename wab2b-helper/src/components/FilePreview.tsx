import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const isTauri = !!(window as any).__TAURI__;

interface FileInfo {
  id: string;
  original_url: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size: number;
}

interface FilePreviewProps {
  file: FileInfo;
  onPreview: () => void;
}

// Enhanced Universal file renderer with retry mechanism and improved error handling
const UniversalMediaRenderer: React.FC<{
  filePath: string;
  fileName: string;
  mimeType: string;
  onLoad: () => void;
  onError: (error: Error, retryCount: number) => void;
  onProgressUpdate?: (stage: 'initializing' | 'downloading' | 'processing' | 'rendering', message: string) => void;
  onClick: () => void;
  className?: string;
  isVideo?: boolean;
  isAudio?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}> = ({ 
  filePath, 
  fileName, 
  mimeType, 
  onLoad, 
  onError, 
  onProgressUpdate,
  onClick, 
  className, 
  isVideo, 
  isAudio,
  maxRetries = 3,
  retryDelay = 1000
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);


  // Sleep utility for retry delays
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Calculate exponential backoff delay
  const getRetryDelay = (attempt: number) => {
    return retryDelay * Math.pow(2, attempt);
  };





  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl: string | null = null;

    const loadFile = async () => {
      if (!isMounted) return;
      
      // Clean up any existing blob URL before creating new one
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
      }
      
      // Reset state
      setBlobUrl(null);
      setHasLoaded(false);
      setRetryCount(0);
      setIsRetrying(false);

      try {
        await loadFileWithRetry(0);
      } catch (err) {
        // Final error handling if all retries failed
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          onError(error, maxRetries + 1);
        }
      }
    };

    // Enhanced file loading with retry mechanism
    const loadFileWithRetry = async (attempt: number = 0): Promise<void> => {
      if (!isMounted) return;

      try {
        console.log(`Loading file (attempt ${attempt + 1}/${maxRetries + 1}):`, filePath);
        
        // Update progress: downloading
        if (onProgressUpdate) {
          onProgressUpdate('downloading', `Reading file data${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}...`);
        }
        
        // Use the Tauri command to read file bytes
        const data = await invoke<number[]>('read_file_bytes', { path: filePath });
        
        // Validate data
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('Invalid or empty file data received');
        }

        // Update progress: processing
        if (onProgressUpdate) {
          onProgressUpdate('processing', 'Processing file data...');
        }

        // Create blob with proper error handling
        const uint8Array = new Uint8Array(data);
        const blob = new Blob([uint8Array], { type: mimeType });
        
        // Validate blob creation
        if (blob.size === 0) {
          throw new Error('Failed to create blob: blob size is 0');
        }

        const url = URL.createObjectURL(blob);
        
        // Validate URL creation
        if (!url || url === 'blob:') {
          throw new Error('Failed to create valid blob URL');
        }

        // Update progress: rendering
        if (onProgressUpdate) {
          onProgressUpdate('rendering', 'Preparing for display...');
        }

        if (isMounted) {
          currentBlobUrl = url;
          setBlobUrl(url);
          setRetryCount(0);
          setIsRetrying(false);
          console.log('Successfully created blob URL for:', fileName);
        } else {
          // Component unmounted, clean up immediately
          URL.revokeObjectURL(url);
        }
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`Failed to load file (attempt ${attempt + 1}):`, error);

        if (!isMounted) return;

        // If we haven't exceeded max retries, attempt retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = getRetryDelay(attempt);
          console.log(`Retrying in ${delay}ms...`);
          setIsRetrying(true);
          setRetryCount(attempt + 1);
          
          await sleep(delay);
          
          // Check if component is still mounted before retrying
          if (isMounted) {
            return loadFileWithRetry(attempt + 1);
          }
        } else {
          // Max retries exceeded, call error handler
          setIsRetrying(false);
          if (isMounted) {
            onError(error, attempt + 1);
          }
        }
      }
    };

    loadFile();

    // Enhanced cleanup function
    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
      }
      // Also clean up the state blob URL if it exists
      setBlobUrl(prevUrl => {
        if (prevUrl && prevUrl !== currentBlobUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, [filePath, mimeType, maxRetries, retryDelay]);

  const handleLoad = () => {
    if (!hasLoaded) {
      setHasLoaded(true);
      onLoad();
    }
  };

  const handleMediaError = (event: any) => {
    const error = new Error(`Media element failed to load: ${event.target?.error?.message || 'Unknown media error'}`);
    onError(error, retryCount);
  };

  // Don't render anything if no blob URL and not retrying
  if (!blobUrl && !isRetrying) return null;

  // Show retry indicator if retrying
  if (isRetrying) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-600 dark:text-blue-400 animate-spin mx-auto"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Retrying... (attempt {retryCount}/{maxRetries})
          </p>
        </div>
      </div>
    );
  }

  if (isVideo && blobUrl) {
    return (
      <video
        src={blobUrl}
        controls
        preload="auto"
        className={className}
        onClick={onClick}
        onLoadedData={handleLoad}
        onCanPlay={handleLoad}
        onError={handleMediaError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    );
  }

  if (isAudio && blobUrl) {
    return (
      <audio
        src={blobUrl}
        controls
        className={className}
        onLoadedData={handleLoad}
        onCanPlay={handleLoad}
        onError={handleMediaError}
      />
    );
  }

  // Default to image
  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={fileName}
        className={className}
        onClick={onClick}
        onLoad={handleLoad}
        onError={handleMediaError}
      />
    );
  }

  return null;
};

const FilePreview: React.FC<FilePreviewProps> = ({ file, onPreview }) => {
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';

  // Enhanced state for media loading status
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [mediaErrorDetails, setMediaErrorDetails] = useState<{
    message: string;
    retryCount: number;
    canRetry: boolean;
  } | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{
    stage: 'initializing' | 'downloading' | 'processing' | 'rendering';
    message: string;
  }>({ stage: 'initializing', message: 'Initializing...' });

  // State for PDF loading
  const [pdfLoading, setPdfLoading] = useState(false);

  // Reset loading state when file changes
  useEffect(() => {
    setMediaLoaded(false);
    setMediaError(false);
    setMediaErrorDetails(null);
    setPdfLoading(false);
    setLoadingProgress({ stage: 'initializing', message: 'Initializing...' });
  }, [file.file_path]);

  // Enhanced error handling function
  const handleMediaError = (error: Error, retryCount: number) => {
    setMediaError(true);
    setMediaErrorDetails({
      message: error.message || 'Failed to load media',
      retryCount,
      canRetry: retryCount <= 3 // Allow retry if we haven't exceeded max attempts
    });
  };

  // Manual retry function
  const handleRetry = () => {
    setMediaLoaded(false);
    setMediaError(false);
    setMediaErrorDetails(null);
    setLoadingProgress({ stage: 'initializing', message: 'Retrying...' });
  };

  // Fallback preview function - opens file externally when preview fails
  const handleFallbackPreview = async () => {
    try {
      await onPreview(); // Use the existing preview handler
    } catch (error) {
      console.error('Fallback preview failed:', error);
    }
  };

  // Enhanced copy function that works even when preview fails
  const handleCopyFile = async () => {
    if (!isTauri) return;
    try {
      await invoke("copy_file_to_clipboard", { path: file.file_path });
      // Could add toast notification here if needed
    } catch (error) {
      console.error('Failed to copy file:', error);
    }
  };

  // Enhanced download function that works even when preview fails
  const handleDownloadFile = async () => {
    if (!isTauri) return;
    try {
      await invoke("save_file", { id: file.id });
      // Could add toast notification here if needed
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  // Progress update handler
  const handleProgressUpdate = (stage: 'initializing' | 'downloading' | 'processing' | 'rendering', message: string) => {
    setLoadingProgress({ stage, message });
  };

  // Enhanced timeout handling for media loading
  useEffect(() => {
    if (!isImage && !isVideo && !isAudio) return;

    // Progressive timeout warnings and final timeout
    const warningTimeoutId = setTimeout(() => {
      if (!mediaLoaded && !mediaError) {
        console.warn('Media loading taking longer than expected:', file.file_name);
      }
    }, 10000); // 10 seconds warning

    const finalTimeoutId = setTimeout(() => {
      if (!mediaLoaded && !mediaError) {
        console.error('Media loading timeout exceeded for:', file.file_name);
        handleMediaError(new Error(`Loading timeout exceeded after 45 seconds for ${file.file_name}`), 0);
      }
    }, 45000); // 45 seconds final timeout (increased for retry attempts)

    return () => {
      clearTimeout(warningTimeoutId);
      clearTimeout(finalTimeoutId);
    };
  }, [file.file_path, file.file_name, isImage, isVideo, isAudio, mediaLoaded, mediaError]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render image preview with stable metadata
  const renderImagePreview = () => {
    return (
      <div className="file-preview-bg relative flex justify-center items-center rounded-lg overflow-hidden min-h-[280px] p-5 transition-colors duration-300">
        {/* Error state */}
        {mediaError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center p-4 max-w-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mx-auto">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Failed to load image</p>
              {mediaErrorDetails && (
                <>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {mediaErrorDetails.message}
                  </p>
                  {mediaErrorDetails.retryCount > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      Attempted {mediaErrorDetails.retryCount} time{mediaErrorDetails.retryCount !== 1 ? 's' : ''}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 mt-3">
                    {mediaErrorDetails.canRetry && (
                      <button
                        onClick={handleRetry}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200 flex items-center mx-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Try Again
                      </button>
                    )}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={handleFallbackPreview}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Open External
                      </button>
                      <button
                        onClick={handleCopyFile}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadFile}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Enhanced loading indicator */}
        {!mediaLoaded && !mediaError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center p-4 max-w-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600 dark:text-blue-400 animate-spin mx-auto"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Loading image...</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {loadingProgress.message}
              </p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                {file.file_name}
              </div>
            </div>
          </div>
        )}

        {/* Universal media renderer */}
        <UniversalMediaRenderer
          filePath={file.file_path}
          fileName={file.file_name}
          mimeType={file.mime_type}
          onLoad={() => {
            setMediaLoaded(true);
          }}
          onError={handleMediaError}
          onProgressUpdate={handleProgressUpdate}
          onClick={onPreview}
          className={`max-w-full max-h-[300px] object-contain rounded-lg shadow-lg cursor-pointer ${!mediaLoaded && !mediaError ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    );
  };

  // Render video preview
  const renderVideoPreview = () => {
    return (
      <div
        className="file-preview-bg relative w-full pt-[56.25%] rounded-lg overflow-hidden cursor-pointer transition-colors duration-300"
        onClick={onPreview}
      >
        {/* Enhanced loading state */}
        {!mediaLoaded && !mediaError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-900/80">
            <div className="text-center p-4 max-w-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600 dark:text-blue-400 animate-spin mx-auto"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Loading video...</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {loadingProgress.message}
              </p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                {file.file_name}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {mediaError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-900/80">
            <div className="text-center p-4 max-w-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600 dark:text-red-400 mx-auto"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Failed to load video</p>
              {mediaErrorDetails && (
                <>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {mediaErrorDetails.message}
                  </p>
                  {mediaErrorDetails.retryCount > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      Attempted {mediaErrorDetails.retryCount} time{mediaErrorDetails.retryCount !== 1 ? 's' : ''}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 mt-3">
                    {mediaErrorDetails.canRetry && (
                      <button
                        onClick={handleRetry}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200 flex items-center mx-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Try Again
                      </button>
                    )}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={handleFallbackPreview}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Open External
                      </button>
                      <button
                        onClick={handleCopyFile}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadFile}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Video player */}
        <div className="absolute inset-0">
          <UniversalMediaRenderer
            filePath={file.file_path}
            fileName={file.file_name}
            mimeType={file.mime_type}
            onLoad={() => {
              setMediaLoaded(true);
            }}
            onError={handleMediaError}
            onProgressUpdate={handleProgressUpdate}
            onClick={onPreview}
            isVideo={true}
            className={`${!mediaLoaded && !mediaError ? 'opacity-0' : 'opacity-100'}`}
          />
        </div>
      </div>
    );
  };

  // Render audio preview
  const renderAudioPreview = () => {
    return (
      <div className="w-full p-4 bg-blue-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
        {/* Enhanced loading state */}
        {!mediaLoaded && !mediaError && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center max-w-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600 dark:text-blue-400 animate-spin mx-auto"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm font-medium">Loading audio...</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {loadingProgress.message}
              </p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                {file.file_name}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {mediaError && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center max-w-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600 dark:text-red-400 mx-auto"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm font-medium">Failed to load audio</p>
              {mediaErrorDetails && (
                <>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {mediaErrorDetails.message}
                  </p>
                  {mediaErrorDetails.retryCount > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      Attempted {mediaErrorDetails.retryCount} time{mediaErrorDetails.retryCount !== 1 ? 's' : ''}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 mt-3">
                    {mediaErrorDetails.canRetry && (
                      <button
                        onClick={handleRetry}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center mx-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Try Again
                      </button>
                    )}
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={handleFallbackPreview}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Open
                      </button>
                      <button
                        onClick={handleCopyFile}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadFile}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Audio player */}
        <UniversalMediaRenderer
          filePath={file.file_path}
          fileName={file.file_name}
          mimeType={file.mime_type}
          onLoad={() => {
            setMediaLoaded(true);
          }}
          onError={handleMediaError}
          onProgressUpdate={handleProgressUpdate}
          onClick={() => {}}
          isAudio={true}
          className={`w-full ${!mediaLoaded && !mediaError ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    );
  };

  // Render PDF preview
  const renderPdfPreview = () => {
    const handlePdfClick = () => {
      setPdfLoading(true);
      try {
        // Call the onPreview function to open the PDF
        onPreview();
      } catch (error) {
        console.error("Error opening PDF:", error);
      } finally {
        // Reset loading state after a short delay to show feedback
        setTimeout(() => setPdfLoading(false), 1000);
      }
    };

    return (
      <div
        className="w-full h-[300px] bg-blue-50 dark:bg-gray-900/50 rounded-lg shadow-md flex items-center justify-center cursor-pointer transition-colors duration-300 border border-gray-300 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-gray-800/80"
        onClick={handlePdfClick}
      >
        {pdfLoading ? (
          <div className="text-center p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600 dark:text-blue-400 animate-spin mx-auto"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Opening PDF...</p>
          </div>
        ) : (
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600 dark:text-red-400 mx-auto mb-2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p className="text-gray-700 dark:text-gray-300 font-medium">Click to open PDF</p>
            <div className="flex flex-col gap-2 mt-3">
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 flex items-center mx-auto"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent double triggering
                  handlePdfClick();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Open External
              </button>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyFile();
                  }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadFile();
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Save
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {file.file_name}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render generic file preview
  const renderGenericPreview = () => {
    return (
      <div
        className="w-full h-[200px] bg-blue-50 dark:bg-gray-900/50 rounded-lg shadow-md flex items-center justify-center cursor-pointer transition-colors duration-300 border border-gray-300 dark:border-gray-700"
        onClick={onPreview}
      >
        <div className="flex flex-col items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-600 dark:text-gray-400 mx-auto"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Click to open file</p>
          <div className="flex gap-2 justify-center mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyFile();
              }}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadFile();
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render preview based on file type
  const renderPreview = () => {
    return (
      <div className="bg-white dark:bg-gray-800/80 rounded-xl overflow-hidden shadow-md border border-gray-300 dark:border-gray-700 transition-all duration-300">
        {isImage && renderImagePreview()}
        {isVideo && renderVideoPreview()}
        {isAudio && renderAudioPreview()}
        {isPdf && renderPdfPreview()}
        {!isImage && !isVideo && !isAudio && !isPdf && renderGenericPreview()}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[800px] mx-auto font-sans text-gray-900 dark:text-gray-200">
      {/* File metadata header */}
      <div className="mb-5 px-5 py-4.5 bg-gray-100 dark:bg-gray-800
                rounded-lg shadow-md border border-gray-300 dark:border-gray-700 
                transition-all duration-300 relative overflow-hidden">
        {/* Subtle accent bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4px',
          backgroundColor: '#2563EB'
        }}
          className="dark:bg-blue-400"
        ></div>

        <h2 className="text-lg font-semibold mb-2 pr-5 overflow-hidden text-ellipsis whitespace-nowrap tracking-tight text-gray-800 dark:text-white">
          {file.file_name}
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span className="text-xs font-medium text-gray-800 dark:text-white bg-blue-100 dark:bg-gray-600 px-2 py-0.5 rounded-md font-mono inline-flex items-center gap-1 border border-blue-200 dark:border-gray-500/30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17ZM19 20H5V4H19V20ZM5 2C3.9 2 3 2.9 3 4V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V4C21 2.9 20.1 2 19 2H5Z" fill="currentColor" />
            </svg>
            {file.mime_type}
          </span>
          <span className="text-xs text-gray-700 dark:text-white/90 font-medium inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z" fill="currentColor" />
            </svg>
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>

      {/* Preview container */}
      <div style={{ marginBottom: '16px' }}>
        {renderPreview()}
      </div>
    </div>
  );
};

export default FilePreview;