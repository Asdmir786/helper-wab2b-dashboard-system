import React from 'react';

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed bottom-0 right-0 p-4 z-50 space-y-4">
      {children}
    </div>
  );
}; 