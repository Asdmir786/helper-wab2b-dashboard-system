/**
 * Update settings component
 * Simple settings interface for update configuration
 */

import React, { useEffect, useRef } from 'react';
import { UpdateSettings as UpdateSettingsType } from '../types';
import { animate } from 'animejs';

interface UpdateSettingsProps {
  settings: UpdateSettingsType;
  onSettingsChange: (settings: UpdateSettingsType) => void;
  onReset?: () => void;
}

export function UpdateSettings({
  settings,
  onSettingsChange,
  onReset,
}: UpdateSettingsProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Animation effect when the component mounts
  useEffect(() => {
    if (containerRef.current) {
      animate(
        containerRef.current,
        {
          translateY: [10, 0],
          opacity: [0, 1],
          easing: 'easeOutCubic',
          duration: 400,
        }
      );
    }
  }, []);
  
  // Handle repository change
  const handleRepoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      githubRepo: e.target.value
    });
  };
  
  // Handle owner change
  const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      githubOwner: e.target.value
    });
  };
  
  // Handle auto check change
  const handleAutoCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      autoCheck: e.target.checked
    });
  };
  
  return (
    <div 
      ref={containerRef}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 max-w-md w-full"
    >
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Update Settings
      </h3>
      
      <div className="space-y-4">
        {/* Auto-check setting */}
        <div className="flex items-center">
          <input
            id="auto-check"
            type="checkbox"
            checked={settings.autoCheck}
            onChange={handleAutoCheckChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="auto-check" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
            Automatically check for updates on startup
          </label>
        </div>
        
        {/* GitHub repository settings */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            GitHub Repository
          </label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Owner
              </label>
              <input
                type="text"
                value={settings.githubOwner}
                onChange={handleOwnerChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="GitHub owner (user or org)"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Repository
              </label>
              <input
                type="text"
                value={settings.githubRepo}
                onChange={handleRepoChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Repository name (e.g. wab2b-helper)"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-5 flex justify-end space-x-3">
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Reset to Defaults
          </button>
        )}
        <button
          onClick={() => {
            // Trigger animation to indicate settings are saved
            if (containerRef.current) {
              animate(
                containerRef.current,
                {
                  scale: [1, 1.02, 1],
                  duration: 300,
                  easing: 'easeOutQuad',
                }
              );
            }
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}