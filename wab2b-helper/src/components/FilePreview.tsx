import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
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

const FilePreview: React.FC<FilePreviewProps> = ({ file, onPreview }) => {
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';
  
  // State for video preview blob URL
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Load video file as blob URL
  useEffect(() => {
    if (!isVideo) return;
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
        const url = URL.createObjectURL(blob);
        setVideoSrc(url);
      } catch (err) {
        console.error('Failed to load video preview', err);
      }
    };
    loadVideo();
  }, [file.file_path, file.mime_type, isVideo]);
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render preview based on file type
  const renderPreview = () => {
    if (isImage) {
      return (
        <img 
          src={`asset://${file.file_path}`} 
          alt={file.file_name}
          className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg cursor-pointer"
          onClick={onPreview}
        />
      );
    }
    
    if (isVideo) {
      return videoSrc ? (
        <div
          className="relative w-full max-w-2xl rounded-lg shadow-lg cursor-pointer overflow-hidden"
          style={{ paddingTop: '50%' }}
          onClick={onPreview}
        >
          <ReactPlayer
            src={videoSrc}
            controls
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        </div>
      ) : (
        <p>Loading video preview...</p>
      );
    }
    
    if (isAudio) {
      return (
        <audio 
          src={`asset://${file.file_path}`}
          controls
          className="w-full"
        />
      );
    }
    
    if (isPdf) {
      return (
        <div 
          className="w-full h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center cursor-pointer file-preview-bg transition-colors duration-200"
          onClick={onPreview}
        >
          <div className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p className="mt-2">Click to open PDF</p>
          </div>
        </div>
      );
    }
    
    // Generic file preview
    return (
      <div 
        className="w-full h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center cursor-pointer file-preview-bg transition-colors duration-200"
        onClick={onPreview}
      >
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p className="mt-2">Click to open file</p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full file-preview">
      <div className="mb-4">
        <h2 className="text-xl font-semibold truncate transition-colors duration-200">{file.file_name}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
          {file.mime_type} • {formatFileSize(file.size)}
        </p>
      </div>
      
      <div className="mb-4">
        {renderPreview()}
      </div>
    </div>
  );
};

export default FilePreview; 