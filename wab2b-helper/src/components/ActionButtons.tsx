import React from 'react';

interface ActionButtonsProps {
  onCopy: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSaveDownload: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onCopy, onSaveDownload }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <button
        onClick={onCopy}
        className="action-button-copy flex-1 py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      </button>
      <button
        onClick={onSaveDownload}
        className="action-button-save flex-1 py-3 px-4 bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Save & Download
      </button>
    </div>
  );
};

export default ActionButtons; 