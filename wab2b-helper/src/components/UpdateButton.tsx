import { useState, useEffect } from 'react';
import { UpdateManager } from '../updater';
import { invoke } from '@tauri-apps/api/core';

interface UpdateButtonProps {
  updateManager: UpdateManager;
}

export function UpdateButton({ updateManager }: UpdateButtonProps): JSX.Element {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  const checkForUpdates = async () => {
    setChecking(true);
    try {
      // Get the beta mode setting from the backend
      const appSettings = await invoke<{ autoUpdate: boolean, betaMode: boolean }>('get_settings');
      
      // Pass the beta mode setting to the update check
      const hasUpdate = await updateManager.checkForUpdates(true, appSettings.betaMode);
      setUpdateAvailable(hasUpdate);
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setChecking(false);
    }
  };
  
  return (
    <button
      onClick={checkForUpdates}
      disabled={checking}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
        updateAvailable
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black hover:text-white dark:text-gray-200 dark:hover:text-black border border-gray-300 dark:border-gray-600'
      }`}
    >
      {checking ? 'Checking...' : updateAvailable ? 'Update Available' : 'Check for Updates'}
    </button>
  );
}