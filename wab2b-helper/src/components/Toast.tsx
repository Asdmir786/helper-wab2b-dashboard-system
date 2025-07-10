import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow exit animation to complete
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      <div className={`rounded-lg px-4 py-3 shadow-lg glass-morphism flex items-center ${
        type === 'success' ? 'bg-green-50 dark:bg-green-900/70' : 'bg-red-50 dark:bg-red-900/70'
      }`}>
        <div className="flex-shrink-0 mr-3">
          {type === 'success' ? (
            <CheckCircleIcon className="h-6 w-6 text-green-500 dark:text-green-300" />
          ) : (
            <XCircleIcon className="h-6 w-6 text-red-500 dark:text-red-300" />
          )}
        </div>
        <div className="text-sm font-medium mr-4 max-w-[250px]">
          {message}
        </div>
        <button
          className="flex-shrink-0 ml-auto focus:outline-none"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}; 