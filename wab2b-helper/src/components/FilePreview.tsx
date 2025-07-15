import React from 'react';

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
      return (
        <video 
          src={`asset://${file.file_path}`}
          controls
          className="max-w-full max-h-[300px] rounded-lg shadow-lg"
        />
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
          className="w-full h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center cursor-pointer"
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
        className="w-full h-[200px] bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center cursor-pointer"
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
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold truncate">{file.file_name}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
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