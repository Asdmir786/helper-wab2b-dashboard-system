import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className="w-full">
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-light dark:bg-primary-dark transition-all duration-300 ease-out"
          style={{ width: `${normalizedProgress}%` }}
        ></div>
      </div>
      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-right">
        {Math.round(normalizedProgress)}%
      </div>
    </div>
  );
};

export default ProgressBar; 