import React, { useState, useEffect } from 'react';
import { readFile } from '@tauri-apps/plugin-fs';
import { tempDir, BaseDirectory } from '@tauri-apps/api/path';

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

// Direct WebP renderer using blob URL instead of canvas
const DirectWebPRenderer: React.FC<{
  filePath: string;
  fileName: string;
  onLoad: () => void;
  onError: () => void;
  onClick: () => void;
  className?: string;
}> = ({ filePath, fileName, onLoad, onError, onClick, className }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadWebP = async () => {
      try {
        // Get OS temp directory path
        const tempPath = await tempDir();
        // Determine file path relative to temp directory
        let relativePath = filePath;
        if (relativePath.startsWith(tempPath)) {
          relativePath = relativePath.substring(tempPath.length);
          if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
            relativePath = relativePath.slice(1);
          }
        }

        // Read file from temp directory
        const data = await readFile(relativePath, { baseDir: BaseDirectory.Temp });
        const blob = new Blob([new Uint8Array(data)], { type: 'image/webp' });
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setBlobUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        if (isMounted) {
          onError();
        }
      }
    };

    loadWebP();

    // Clean up blob URL when component unmounts
    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [filePath, onError, blobUrl]);

  const handleLoad = () => {
    if (!hasLoaded) {
      setHasLoaded(true);
      onLoad();
    }
  };

  return blobUrl ? (
    <img
      src={blobUrl}
      alt={fileName}
      className={className}
      onClick={onClick}
      onLoad={handleLoad}
      onError={onError}
    />
  ) : null;
};

const FilePreview: React.FC<FilePreviewProps> = ({ file, onPreview }) => {
  const isImage = file.mime_type.startsWith('image/');
  const isWebP = file.mime_type === 'image/webp';
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';

  // State for direct WebP rendering
  const [useDirectWebP, setUseDirectWebP] = useState(isWebP);

  // State for video preview blob URL
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  // State for image loading status
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // State for PDF loading
  const [pdfLoading, setPdfLoading] = useState(false);

  // Reset loading state when file changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setUseDirectWebP(isWebP);
    setVideoLoading(true);
    setVideoError(false);
    setVideoSrc(null);
    setPdfLoading(false);
  }, [file.file_path, isWebP]);

  // Add state for image loading timeout
  useEffect(() => {
    if (!isImage) return;

    // Set a timeout to prevent infinite loading spinner
    const timeoutId = setTimeout(() => {
      if (!imageLoaded && !imageError) {
        setImageError(true);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [file.file_path, isImage, imageLoaded, imageError]);

  // Load video file as blob URL
  useEffect(() => {
    if (!isVideo) return;

    let isMounted = true;
    let blobUrl: string | null = null;
    setVideoLoading(true);

    const loadVideo = async () => {
      try {
        // Get OS temp directory path
        const tempPath = await tempDir();
        // Determine file path relative to temp directory
        let relativePath = file.file_path;
        if (relativePath.startsWith(tempPath)) {
          relativePath = relativePath.substring(tempPath.length);
          if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
            relativePath = relativePath.slice(1);
          }
        }

        // Read file from temp directory
        const data = await readFile(relativePath, { baseDir: BaseDirectory.Temp });
        const blob = new Blob([new Uint8Array(data)], { type: file.mime_type });
        blobUrl = URL.createObjectURL(blob);

        // Only update state if component is still mounted
        if (isMounted) {
          setVideoSrc(blobUrl);
          // Set a short timeout to force the loading state to end if events don't fire
          setTimeout(() => {
            if (isMounted) {
              setVideoLoading(false);
            }
          }, 1000);
        } else if (blobUrl) {
          // Clean up the blob URL if component unmounted during load
          URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        if (isMounted) {
          setVideoError(true);
          setVideoLoading(false);
        }
      }
    };

    loadVideo();

    // Set a timeout for video loading as well
    const timeoutId = setTimeout(() => {
      if (isMounted && videoLoading) {
        setVideoError(true);
        setVideoLoading(false);
      }
    }, 10000); // 10 seconds timeout for videos

    // Clean up function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      // Clean up any existing video blob URL when component unmounts or file changes
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file.file_path, file.mime_type, isVideo]);

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
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mx-auto">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300">Failed to load image</p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-800 rounded-lg">
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
              <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Loading image...</p>
            </div>
          </div>
        )}

        {/* WebP special handling */}
        {isWebP && useDirectWebP ? (
          <DirectWebPRenderer
            filePath={file.file_path}
            fileName={file.file_name}
            onLoad={() => {
              setImageLoaded(true);
            }}
            onError={() => {
              setImageError(true);
            }}
            onClick={onPreview}
            className={`max-w-full max-h-[300px] object-contain rounded-lg shadow-lg cursor-pointer ${!imageLoaded && !imageError ? 'opacity-0' : 'opacity-100'}`}
          />
        ) : (
          <img
            src={`asset://${file.file_path}`}
            alt={file.file_name}
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              opacity: !imageLoaded && !imageError ? 0 : 1
            }}
            onClick={onPreview}
            onLoad={() => {
              setImageLoaded(true);
            }}
            onError={() => {
              // If it's a WebP image, try the direct method
              if (isWebP && !useDirectWebP) {
                setUseDirectWebP(true);
              } else {
                setImageError(true);
                setImageLoaded(false);
              }
            }}
          />
        )}
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
        {/* Loading state */}
        {videoLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-900/80">
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
              <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Loading video...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-gray-900/80">
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
                className="text-red-600 dark:text-red-400 mx-auto"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">Failed to load video</p>
            </div>
          </div>
        )}

        {/* Video player - show as soon as we have a source */}
        {videoSrc && !videoError && (
          <video
            src={videoSrc}
            controls
            preload="auto"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            onLoadedData={() => {
              setVideoLoading(false);
            }}
            onCanPlay={() => {
              setVideoLoading(false);
            }}
            onError={() => {
              setVideoError(true);
              setVideoLoading(false);
            }}
          />
        )}
      </div>
    );
  };

  // Render audio preview
  const renderAudioPreview = () => {
    return (
      <div className="w-full p-4 bg-blue-50 dark:bg-gray-900/50 rounded-lg border border-gray-300 dark:border-gray-700">
        <audio
          src={`asset://${file.file_path}`}
          controls
          className="w-full"
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
            <button 
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 flex items-center mx-auto"
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