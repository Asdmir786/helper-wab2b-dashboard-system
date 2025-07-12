import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ArrowUpCircleIcon } from '@heroicons/react/24/outline';

interface UpdateNotificationProps {
  addToast: (message: string, type: 'success' | 'error', duration?: number) => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ addToast }) => {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  
  useEffect(() => {
    // Listen for update availability
    const unlisten1 = listen<string>('update-available', (event) => {
      const version = event.payload;
      setNewVersion(version);
      addToast(`Update ${version} is available!`, 'success', 10000);
    });

    // Listen for update download progress
    const unlisten2 = listen<number>('update-download-progress', (event) => {
      const progress = event.payload;
      setDownloadProgress(progress);
    });

    // Check for updates on component mount
    const checkForUpdates = async () => {
      try {
        await invoke('check_update');
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    checkForUpdates();

    return () => {
      unlisten1.then(fn => fn());
      unlisten2.then(fn => fn());
    };
  }, [addToast]);

  const installUpdate = async () => {
    if (isInstalling) return;
    
    try {
      setIsInstalling(true);
      setDownloadProgress(0);
      addToast('Downloading update...', 'success');
      
      await invoke('download_and_install_update');
      
      // If we get here, we're about to restart
      addToast('Update downloaded! Restarting...', 'success');
    } catch (error) {
      console.error('Failed to install update:', error);
      addToast(`Update failed: ${error}`, 'error');
      setIsInstalling(false);
      setDownloadProgress(null);
    }
  };

  // Don't render anything if no update is available
  if (!newVersion) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md glass-morphism z-40">
      <div className="flex items-center gap-3">
        <ArrowUpCircleIcon className="h-6 w-6 text-blue-500" />
        <div className="flex-1">
          <h3 className="font-medium text-[var(--panel-text)]">
            Update available: v{newVersion}
          </h3>
          
          {downloadProgress !== null && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>
        
        <button
          onClick={installUpdate}
          disabled={isInstalling}
          className={`px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm
            ${isInstalling ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isInstalling ? 'Installing...' : 'Install'}
        </button>
      </div>
    </div>
  );
}; 