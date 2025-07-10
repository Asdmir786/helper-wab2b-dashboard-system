import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckIcon, DocumentIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { writeText, writeImage } from '@tauri-apps/plugin-clipboard';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document';
  name: string;
  url: string;
  thumbnailUrl?: string;
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  title?: string;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  isOpen,
  onClose,
  mediaItems,
  title = 'Media Attachments'
}) => {
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [copyingAll, setCopyingAll] = useState(false);
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);

  // Function to copy a single media item
  const copyMediaItem = async (mediaItem: MediaItem) => {
    try {
      // For simplicity, we're just handling the URL directly
      // In a real app, you'd fetch the actual blob and handle it
      if (mediaItem.type === 'image') {
        // For demo purposes. In a real app, you'd fetch the image as blob first
        const response = await fetch(mediaItem.url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = async function() {
          const dataUrl = reader.result as string;
          try {
            await writeImage(dataUrl);
            setCopiedItems(prev => ({ ...prev, [mediaItem.id]: true }));
            showNotification(`Copied ${mediaItem.name} to clipboard!`);
          } catch (error) {
            console.error('Failed to copy image to clipboard:', error);
          }
        };
        reader.readAsDataURL(blob);
      } else {
        // For documents and videos, just copy the URL for now
        await writeText(mediaItem.url);
        setCopiedItems(prev => ({ ...prev, [mediaItem.id]: true }));
        showNotification(`Copied ${mediaItem.name} to clipboard!`);
      }
    } catch (error) {
      console.error('Error copying media:', error);
      showNotification('Failed to copy media item', true);
    }
  };

  // Function to copy all media items
  const copyAllMedia = async () => {
    setCopyingAll(true);
    try {
      // In a real app, you might want to create a zip or handle this differently
      const promises = mediaItems.map(item => copyMediaItem(item));
      await Promise.all(promises);
      setCopyAllSuccess(true);
      showNotification('All media items copied to clipboard!');
    } catch (error) {
      console.error('Error copying all media:', error);
      showNotification('Failed to copy all media items', true);
    } finally {
      setCopyingAll(false);
      setTimeout(() => {
        setCopyAllSuccess(false);
      }, 3000);
    }
  };

  // Simple notification function
  const showNotification = (message: string, isError = false) => {
    // In a real app, you might use a toast component or native OS notifications
    console.log(message);
    // You can implement a more sophisticated notification system
  };

  // Get icon based on media type
  const getIconForMediaType = (type: MediaItem['type']) => {
    switch (type) {
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
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all glass-morphism">
                <Dialog.Title as="div" className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {mediaItems.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No media items available
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {mediaItems.map(item => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-700"
                        >
                          <div className="flex items-center space-x-3">
                            {getIconForMediaType(item.type)}
                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                              {item.name}
                            </span>
                          </div>
                          <button
                            onClick={() => copyMediaItem(item)}
                            className={`p-2 rounded-full ${
                              copiedItems[item.id]
                                ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200'
                                : 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700'
                            }`}
                          >
                            {copiedItems[item.id] ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <span className="text-xs px-1">Copy</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      copyAllSuccess
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${copyingAll ? 'opacity-75 cursor-not-allowed' : ''}`}
                    onClick={copyAllMedia}
                    disabled={copyingAll || mediaItems.length === 0}
                  >
                    {copyingAll ? (
                      'Copying...'
                    ) : copyAllSuccess ? (
                      <>
                        <CheckIcon className="h-5 w-5 mr-1" />
                        Copied All
                      </>
                    ) : (
                      'Copy All & Close'
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}; 