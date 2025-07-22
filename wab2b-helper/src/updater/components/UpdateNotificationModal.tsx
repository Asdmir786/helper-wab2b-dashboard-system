// React is automatically imported by JSX transform
import { UpdateState } from '../types';
import React, { Suspense } from 'react';
const ReactMarkdown = React.lazy(() => import('react-markdown'));

interface UpdateNotificationModalProps {
  updateState: UpdateState;
  onInstall: () => void;
  onLater: () => void;
  onClose: () => void;
}

export function UpdateNotificationModal({
  updateState,
  onInstall,
  onLater,
  onClose,
}: UpdateNotificationModalProps): JSX.Element {
  if (updateState.status !== 'available') {
    return <></>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 m-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Update Available
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mr-2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
            <span className="text-gray-700 dark:text-gray-300">
              Version {updateState.latestVersion} is now available. You have {updateState.currentVersion}.
            </span>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mt-3 max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Release Notes:</h4>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {updateState.releaseNotes ? (
                <Suspense fallback={<p>Loading release notes...</p>}>
                  <ReactMarkdown>{updateState.releaseNotes}</ReactMarkdown>
                </Suspense>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No release notes available</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onLater}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Later
          </button>
          <button
            onClick={onInstall}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
          >
            Install Update
          </button>
        </div>
      </div>
    </div>
  );
}