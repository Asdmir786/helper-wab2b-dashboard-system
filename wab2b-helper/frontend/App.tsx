import { useState } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { AttachmentHandler } from "./components/AttachmentHandler";
import { UpdateNotification } from "./components/UpdateNotification";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Toast } from "./components/Toast";
import { invoke } from "@tauri-apps/api/core";

// Simple container component for toasts
const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed bottom-0 right-0 p-4 z-50 space-y-4">
      {children}
    </div>
  );
};

function App() {
  const [toasts, setToasts] = useState<Array<{
    id: number,
    message: string,
    type: 'success' | 'error',
    duration: number
  }>>([]);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);

  const addToast = (message: string, type: 'success' | 'error', duration = 3000) => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, duration);
  };

  const handleAttachmentHandlerClose = () => {
    // We'll keep this even though showAttachmentHandler is removed
    // This function is passed to AttachmentHandler and used when closing
  };

  const checkForUpdates = async () => {
    if (isCheckingForUpdates) return;
    
    setIsCheckingForUpdates(true);
    try {
      const hasUpdate = await invoke<boolean>('check_update');
      if (!hasUpdate) {
        addToast('You are already using the latest version!', 'success');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      addToast(`Error checking for updates: ${error}`, 'error');
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--body-bg)] transition-colors duration-500">
        {/* Theme toggle positioned in the corner */}
        <header className="absolute top-4 right-4 flex items-center gap-2">
          {/* Check for updates button - now enabled */}
          <button
            onClick={checkForUpdates}
            disabled={isCheckingForUpdates}
            title="Check for updates"
            className={`w-9 h-9 rounded-full bg-[var(--control-bg)] flex items-center justify-center
              ${isCheckingForUpdates ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--control-hover-bg)]'}`}
          >
            <ArrowPathIcon className={`h-5 w-5 text-[var(--control-icon)] 
              ${isCheckingForUpdates ? 'animate-spin' : ''}`} />
          </button>
          <ThemeToggle />
        </header>

        {/* Main rectangle */}
        <div className="w-80 p-6 rounded-lg shadow-md glass-morphism text-center">
          <h2 className="text-lg font-semibold text-[var(--panel-text)] mb-4">
            Waiting for an attachment…
          </h2>
        </div>

        {/* AttachmentHandler */}
        <AttachmentHandler 
          onClose={handleAttachmentHandlerClose}
          addToast={addToast}
        />
        
        {/* Update Notification */}
        <UpdateNotification addToast={addToast} />
      </div>
      
      {/* Toast container */}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} 
          />
        ))}
      </ToastContainer>
    </ThemeProvider>
  );
}

export default App;
