import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  updateManager?: any; // UpdateManager instance
}

interface AppSettings {
  autoUpdate: boolean;
  betaMode: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, isDarkMode, updateManager }) => {
  const [settings, setSettings] = useState<AppSettings>({
    autoUpdate: true,
    betaMode: false
  });

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const savedSettings = await invoke<AppSettings>('get_settings');
      setSettings(savedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await invoke('update_settings', { settings });
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleToggleAutoUpdate = () => {
    setSettings(prev => ({ ...prev, autoUpdate: !prev.autoUpdate }));
  };

  const handleToggleBetaMode = async () => {
    const newBetaMode = !settings.betaMode;
    setSettings(prev => ({ ...prev, betaMode: newBetaMode }));
    
    // If disabling beta mode, check for the latest stable release
    if (!newBetaMode) {
      try {
        // Save the setting immediately to ensure the next update check uses the new setting
        await invoke('update_settings', { settings: { ...settings, betaMode: newBetaMode } });
        
        // Check for the latest stable release using the updateManager if available
        if (updateManager) {
          await updateManager.checkForUpdates(true, false); // Manual check, exclude beta
        } else {
          console.log('UpdateManager not available, using direct invoke');
          await invoke('check_for_updates', { 
            owner: 'Asdmir786', 
            repo: 'helper-wab2b-dashboard-system',
            includeBeta: false 
          });
        }
      } catch (error) {
        console.error('Failed to check for stable release:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Auto Update Setting */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Automatic Updates</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically download updates when available
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.autoUpdate}
                onChange={handleToggleAutoUpdate}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600`}></div>
            </label>
          </div>

          {/* Beta Mode Setting */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white">{settings.betaMode ? "Beta Mode" : "Go back to Stable Release"}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {settings.betaMode ? "Receive beta updates with new features" : "Check for the latest stable release"}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.betaMode}
                onChange={handleToggleBetaMode}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600`}></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;