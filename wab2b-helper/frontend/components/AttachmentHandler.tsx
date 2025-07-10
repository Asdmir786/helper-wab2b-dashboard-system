import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { writeText, writeImage } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/api/dialog';
import { open } from '@tauri-apps/plugin-opener';
import { CheckIcon, DocumentIcon, PhotoIcon, VideoCameraIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface AttachmentHandlerProps {
  onClose: () => void;
  addToast: (message: string, type: 'success' | 'error', duration?: number) => void;
}

export const AttachmentHandler: React.FC<AttachmentHandlerProps> = ({ onClose, addToast }) => {
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'document'>('document');
  const [fileName, setFileName] = useState<string>('attachment');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    // Listen for attachment URL events from the Rust backend
    const unlisten = listen<string>('attachment-url', (event) => {
      const url = event.payload;
      setAttachmentUrl(url);
      
      // Determine attachment type based on URL
      if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        setAttachmentType('image');
        // Extract filename from URL
        const urlParts = url.split('/');
        setFileName(urlParts[urlParts.length - 1]);
      } else if (url.match(/\.(mp4|webm|mov|avi|wmv)$/i)) {
        setAttachmentType('video');
        const urlParts = url.split('/');
        setFileName(urlParts[urlParts.length - 1]);
      } else {
        setAttachmentType('document');
        const urlParts = url.split('/');
        setFileName(urlParts[urlParts.length - 1]);
      }
      
      // Automatically copy to clipboard
      copyToClipboard(url);
    });

    return () => {
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, []);

  const copyToClipboard = async (url: string) => {
    try {
      if (attachmentType === 'image') {
        // For images, fetch and convert to data URL
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = async function() {
          const dataUrl = reader.result as string;
          try {
            await writeImage(dataUrl);
            setIsCopied(true);
            addToast(`Image copied to clipboard!`, 'success');
          } catch (error) {
            console.error('Failed to copy image:', error);
            addToast(`Failed to copy image`, 'error');
          }
        };
        reader.readAsDataURL(blob);
      } else {
        // For other types, just copy the URL
        await writeText(url);
        setIsCopied(true);
        addToast(`Attachment URL copied to clipboard!`, 'success');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      addToast(`Failed to copy to clipboard`, 'error');
    }
  };

  const downloadAttachment = async () => {
    if (!attachmentUrl) return;
    
    setIsDownloading(true);
    try {
      // Ask user where to save the file
      const filePath = await save({
        defaultPath: fileName,
        filters: []
      });
      
      if (filePath) {
        // Use the Rust function to download the file
        const result = await invoke('download_file', { 
          url: attachmentUrl,
          filePath 
        });
        
        if (result) {
          addToast(`File saved successfully!`, 'success');
          // Open the file with the default application
          await open(filePath);
        }
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      addToast(`Failed to download attachment`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // If no attachment URL, render nothing
  if (!attachmentUrl) {
    return null;
  }

  // Get icon based on media type
  const getIconForMediaType = () => {
    switch (attachmentType) {
      case 'image':
        return <PhotoIcon className="h-6 w-6 text-blue-500" />;
      case 'video':
        return <VideoCameraIcon className="h-6 w-6 text-red-500" />;
      case 'document':
        return <DocumentIcon className="h-6 w-6 text-green-500" />;
      default:
        return <DocumentIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl glass-morphism">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Attachment Ready
          </h3>
          <button
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center">
            {getIconForMediaType()}
            <div className="ml-3 flex-1">
              <p className="font-medium text-gray-800 dark:text-white truncate">
                {fileName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {attachmentUrl}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center">
            <div className="flex-1 text-sm text-green-600 dark:text-green-400 flex items-center">
              <CheckIcon className="h-5 w-5 mr-1" />
              Copied to clipboard
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-4 justify-center">
          <button
            type="button"
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center ${isCopied ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={() => copyToClipboard(attachmentUrl)}
          >
            {isCopied ? (
              <>
                <CheckIcon className="h-5 w-5 mr-1" />
                Copied
              </>
            ) : (
              'Copy Again'
            )}
          </button>
          <button
            type="button"
            className={`px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center ${isDownloading ? 'opacity-75 cursor-not-allowed' : ''}`}
            onClick={downloadAttachment}
            disabled={isDownloading}
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
            {isDownloading ? 'Downloading...' : 'Download & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}; 