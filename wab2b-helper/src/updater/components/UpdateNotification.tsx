/**
 * Update notification component
 * A non-modal notification that appears in the corner of the screen
 */

import { Suspense, useEffect, useRef } from 'react';
import { animate } from 'animejs';
import ReactMarkdown from 'react-markdown';

interface UpdateNotificationProps {
  version: string;
  releaseNotes: string;
  onInstall: () => void;
  onLater: () => void;
  onDetails?: () => void;
}

export function UpdateNotification({
  version,
  releaseNotes,
  onInstall,
  onLater,
  onDetails,
}: UpdateNotificationProps): JSX.Element {
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Extract the first paragraph of release notes for the brief preview
  const briefNotes = releaseNotes.split('\n\n')[0].substring(0, 100) + 
    (releaseNotes.length > 100 ? '...' : '');
  
  // Format emoji categories if present
  const formattedNotes = formatReleaseNotes(briefNotes);
  
  // Animation effect when the component mounts
  useEffect(() => {
    if (notificationRef.current) {
      animate(notificationRef.current, {
        translateY: [20, 0],
        opacity: [0, 1],
        easing: 'easeOutCubic',
        duration: 500
      });
    }
  }, []);
  
  return (
    <div 
      ref={notificationRef}
      className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full border-l-4 border-blue-500 z-50"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
          </div>
          <h3 className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
            Update Available: v{version}
          </h3>
        </div>
        <button 
          onClick={onLater}
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Suspense fallback={<p>Loading release notes...</p>}>
            <ReactMarkdown>{formattedNotes}</ReactMarkdown>
          </Suspense>
        </div>
      </div>
      
      <div className="mt-3 flex justify-end space-x-2">
        {onDetails && (
          <button
            onClick={onDetails}
            className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Details
          </button>
        )}
        <button
          onClick={onLater}
          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
        >
          Later
        </button>
        <button
          onClick={onInstall}
          className="px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}

/**
 * Format release notes to highlight emoji categories
 * @param notes Release notes text
 * @returns Formatted release notes
 */
function formatReleaseNotes(notes: string): string {
  // Replace emoji category patterns like "🚀 Features:" with styled versions
  return notes.replace(
    /([\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}]\s+[A-Za-z]+:)/gu,
    '**$1**'
  );
}