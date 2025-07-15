import React, { useState, useCallback } from 'react';

interface DropZoneProps {
  onDrop: (url: string) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Get text from drag event
    const text = e.dataTransfer.getData('text');
    if (text && isValidUrl(text)) {
      onDrop(text);
    } else {
      setError('Invalid URL. Please drag a valid URL.');
    }
  }, [onDrop]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (url && isValidUrl(url)) {
      onDrop(url);
      setUrl('');
      setError(null);
    } else {
      setError('Please enter a valid URL');
    }
  }, [url, onDrop]);

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="w-full max-w-md">
      <div 
        className={`border-2 border-dashed p-8 rounded-lg flex flex-col items-center justify-center mb-6 transition-colors
          ${isDragging 
            ? 'border-primary-light dark:border-primary-dark bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-700 bg-surface-light dark:bg-surface-dark'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: '200px' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-gray-400 dark:text-gray-500">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Drag and drop a URL here
        </p>
        <p className="text-center text-gray-500 dark:text-gray-500 text-sm mt-2">
          or paste a URL below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL (e.g., https://example.com/file.jpg)"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            Download
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 text-red-500 dark:text-red-400 text-sm">
          {error}
        </p>
      )}

      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">How to use wab2b-helper:</h3>
        <ol className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <li>Drag and drop a URL or enter it manually</li>
          <li>Use the custom protocol: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">wab2b-helper:https://example.com/file.jpg</code></li>
          <li>Click on the file preview to open it</li>
          <li>Use "Copy" to copy the file or "Save & Download" to save it</li>
        </ol>
      </div>
    </div>
  );
};

export default DropZone; 