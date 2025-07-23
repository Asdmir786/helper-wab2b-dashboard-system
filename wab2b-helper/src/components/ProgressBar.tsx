import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  // Ensure progress is between 0 and 100
  const safeProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner border border-gray-400/20 dark:border-gray-600/20">
      <div 
        className="h-full bg-[var(--primary-light)] dark:bg-[var(--primary-dark)]" 
        style={{ width: `${safeProgress}%` }}
      />
    </div>
  );
};

export default ProgressBar; 