import { useState } from 'react';
import { UpdateManager } from '../updater';

interface UpdateButtonProps {
  updateManager: UpdateManager;
}

export function UpdateButton({ updateManager }: UpdateButtonProps): JSX.Element {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const hasUpdate = await updateManager.checkForUpdates(true);
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
          ? 'bg-blue-500 hover:bg-blue-600 text-white'
          : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
      }`}
    >
      {checking ? 'Checking...' : updateAvailable ? 'Update Available' : 'Check for Updates'}
    </button>
  );
}