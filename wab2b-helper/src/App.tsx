import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { animate, createScope } from "animejs";
import "./App.css";
import React, {Suspense} from "react";
const TitleBar = React.lazy(() => import("./components/TitleBar"));
const FilePreview = React.lazy(() => import("./components/FilePreview"));
const ActionButtons = React.lazy(() => import("./components/ActionButtons"));
const ThemeToggle = React.lazy(() => import("./components/ThemeToggle"));
const ProgressBar = React.lazy(() => import("./components/ProgressBar"));
import packageJson from "../package.json";
import { openPath } from '@tauri-apps/plugin-opener';
import { UpdateManager, UpdateNotificationModal } from './updater';
// (removed plugin-clipboard-manager import)

// Types
interface FileInfo {
  id: string;
  original_url: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size: number;
}

export const isTauri = !!(window as any).__TAURI__;

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [file, setFile] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<any>(null);
  const fileContentRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Add toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Initialize update manager
  const [updateManager] = useState<UpdateManager>(() => new UpdateManager({
    githubOwner: 'Asdmir786',
    githubRepo: 'helper-wab2b-dashboard-system'
  }));

  // Track update state
  const [updateState, setUpdateState] = useState(updateManager.getUpdateState());

  // Listen for update state changes
  useEffect(() => {
    if (!isTauri) return;

    const unsubscribe = updateManager.onStateChange((state) => {
      setUpdateState(state);

      // Show toast notifications for update events
      if (state.status === 'available') {
        setToast({
          message: `Update available: v${state.latestVersion}`,
          type: 'success'
        });
      } else if (state.status === 'error') {
        setToast({
          message: `Update error: ${state.error}`,
          type: 'error'
        });
      }
    });

    // Check for updates on app start
    if (updateManager.getUpdateState().status === 'idle') {
      updateManager.checkForUpdates(false).catch(console.error);
    }

    return unsubscribe;
  }, [updateManager]);

  // Initialize theme based on system preference
  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Initialize animation scope
  useEffect(() => {
    if (!rootRef.current) return;

    // Create animation scope
    scopeRef.current = createScope({
      root: rootRef.current
    }).add(self => {
      // Register reusable animations
      self.add('spinnerRotate', () => {
        if (!spinnerRef.current) return;
        animate(spinnerRef.current, {
          rotate: '360deg',
          duration: 1000,
          easing: 'linear',
          loop: true
        });
      });

      self.add('showFileContent', () => {
        if (!fileContentRef.current) return;
        animate(fileContentRef.current, {
          translateY: [20, 0],
          opacity: [0, 1],
          easing: 'easeOutCubic',
          duration: 300
        });
      });

      self.add('buttonFeedback', (element: HTMLElement) => {
        animate(element, {
          scale: [1, 1.1, 1],
          duration: 400,
          easing: 'easeInOutQuad'
        });
      });

      self.add('updateProgress', (value: number) => {
        if (!progressBarRef.current) return;
        const progressEl = progressBarRef.current.querySelector('div');
        if (progressEl) {
          animate(progressEl, {
            width: `${value}%`,
            easing: 'easeOutQuad',
            duration: 300
          });
        }
      });

      self.add('themeChange', (isDark: boolean) => {
        if (!mainRef.current) return;

        const targetBgColor = isDark ? 'rgb(18, 18, 18)' : 'rgb(248, 250, 252)';
        const targetTextColor = isDark ? 'rgb(241, 245, 249)' : 'rgb(17, 24, 39)';

        animate(mainRef.current, {
          backgroundColor: targetBgColor,
          color: targetTextColor,
          easing: 'easeInOutQuad',
          duration: 300
        });

        // Also animate any other elements that need theme transition
        const copyButtons = document.querySelectorAll('.action-button-copy');
        if (copyButtons.length > 0) {
          animate(copyButtons, {
            backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
            color: isDark ? 'rgb(243, 244, 246)' : 'rgb(31, 41, 55)',
            easing: 'easeInOutQuad',
            duration: 300
          });
        }

        const saveButtons = document.querySelectorAll('.action-button-save');
        if (saveButtons.length > 0) {
          animate(saveButtons, {
            backgroundColor: isDark ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)',
            color: '#ffffff',
            easing: 'easeInOutQuad',
            duration: 300
          });
        }

        // Animate file info text
        const fileInfo = document.querySelectorAll('.file-preview h2, .file-preview p');
        if (fileInfo.length > 0) {
          animate(fileInfo, {
            color: isDark ? 'rgb(243, 244, 246)' : 'rgb(31, 41, 55)',
            easing: 'easeInOutQuad',
            duration: 300
          });
        }

        // Animate generic file preview backgrounds
        const filePreviewBgs = document.querySelectorAll('.file-preview-bg');
        if (filePreviewBgs.length > 0) {
          animate(filePreviewBgs, {
            backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(243, 244, 246)',
            easing: 'easeInOutQuad',
            duration: 300
          });
        }
      });

      self.add('showError', (errorElement: HTMLElement) => {
        animate(errorElement, {
          opacity: [0, 1],
          translateY: [10, 0],
          easing: 'easeOutQuad',
          duration: 300
        });
      });
    });

    return () => {
      // Cleanup all animations when component unmounts
      if (scopeRef.current) {
        scopeRef.current.revert();
      }
    };
  }, []);

  // Start spinner animation when loading changes
  useEffect(() => {
    if (loading && scopeRef.current?.methods) {
      scopeRef.current.methods.spinnerRotate();
    }
  }, [loading]);

  // Animate file content when file is set
  useEffect(() => {
    if (file && scopeRef.current?.methods) {
      scopeRef.current.methods.showFileContent();
    }
  }, [file]);

  // Animate progress bar updates
  useEffect(() => {
    if (scopeRef.current?.methods && progressBarRef.current) {
      scopeRef.current.methods.updateProgress(progress);
    }
  }, [progress]);

  // Add effect for toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Wrap all Tauri-dependent useEffects with isTauri check
  useEffect(() => {
    if (!isTauri) return;
    const unlisten = listen<string>("deep-link-received", (event) => {
      handleDeepLink(event.payload);
    });

    return () => {
      void unlisten.then(unlistenFn => unlistenFn()).catch(console.error);
    };
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    const unlisten = listen<number>("download-progress", (event) => {
      setProgress(event.payload);
    });

    return () => {
      void unlisten.then(unlistenFn => unlistenFn()).catch(console.error);
    };
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    const unlisten = listen<string>("theme-changed", (event) => {
      const newTheme = event.payload as "light" | "dark";
      setTheme(newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    });

    return () => {
      void unlisten.then(unlistenFn => unlistenFn()).catch(console.error);
    };
  }, []);

  // (save-file-dialog listener removed – save dialog now handled natively in Rust)

  // Handle deep link
  const handleDeepLink = async (url: string) => {
    if (!isTauri) {
      setError('Tauri not available in web mode');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const actualUrl = url.replace(/^wab2b-helper:\/*/i, '');

      // Download the file
      const fileInfo = await invoke<FileInfo>("download_file", { url: actualUrl });
      setFile(fileInfo);
    } catch (err) {
      console.error("Error handling deep link:", err);
      setError(`Failed to download file: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle theme
  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");

    // Animate theme change
    if (scopeRef.current?.methods) {
      scopeRef.current.methods.themeChange(newTheme === "dark");
    }

    if (isTauri) {
      await invoke("set_theme", { theme: newTheme });
    }
  };

  // Copy file to clipboard
  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isTauri || !file) return;
    try {
      await invoke("copy_file_to_clipboard", { path: file.file_path });
      if (scopeRef.current?.methods) {
        scopeRef.current.methods.buttonFeedback(e.currentTarget);
      }
      setToast({ message: 'Copied file to native clipboard!', type: 'success' });
    } catch (err) {
      console.error("Error copying file natively:", err);
      setToast({ message: 'Failed to copy file natively', type: 'error' });
    }
  };

  // Save and download file
  const handleSaveDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isTauri || !file) return;

    try {
      await invoke("save_file", { id: file.id });

      // Add a visual feedback animation
      if (scopeRef.current?.methods) {
        scopeRef.current.methods.buttonFeedback(e.currentTarget);
      }
    } catch (err) {
      console.error("Error saving file:", err);
      setError(`Failed to save file: ${err}`);
    }
  };

  // Preview file
  const handlePreview = async () => {
    if (!isTauri || !file) return;
    // Skip external open for previewable media types (images, video, audio, PDF)
    if (
      file.mime_type.startsWith('video/') ||
      file.mime_type.startsWith('image/') ||
      file.mime_type.startsWith('audio/') ||
      file.mime_type === 'application/pdf'
    ) {
      return;
    }
    try {
      // Use the JS API for opener for other files
      await openPath(file.file_path);
    } catch (err) {
      console.error('Error previewing file:', err);
      setError(`Failed to preview file: ${err}`);
    }
  };

  // Effect to show error animation when error changes
  useEffect(() => {
    if (error && scopeRef.current?.methods) {
      // Use a small timeout to ensure the element is in the DOM
      setTimeout(() => {
        const errorElement = document.querySelector('.error-message');
        if (errorElement instanceof HTMLElement) {
          scopeRef.current.methods.showError(errorElement);
        }
      }, 10);
    }
  }, [error]);

  // Handle update installation
  const handleInstallUpdate = async () => {
    if (updateState.status !== 'available') return;

    try {
      setToast({ message: 'Downloading update...', type: 'success' });
      await updateManager.downloadUpdate();

      // The update installation will be handled by the updateManager
      // which will restart the app after installation
    } catch (error) {
      console.error('Error installing update:', error);
      setToast({
        message: `Update installation failed: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    }
  };

  // Dismiss update notification
  const handleDismissUpdate = () => {
    // Just hide the modal, don't change the update state
    setShowUpdateModal(false);
  };

  // State to control the visibility of the update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Show update modal when an update is available
  useEffect(() => {
    if (updateState.status === 'available') {
      setShowUpdateModal(true);
    }
  }, [updateState.status]);

  // Loading fallback component for Suspense
  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full w-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className={`flex flex-col h-full w-full ${theme === "dark" ? "dark" : ""}`} ref={rootRef}>
      <Suspense fallback={<LoadingFallback />}>
        <TitleBar version={packageJson.version} isDarkMode={theme === 'dark'} updateManager={updateManager} />

        {/* Update notification modal */}
        {showUpdateModal && updateState.status === 'available' && (
          <UpdateNotificationModal
            updateState={updateState}
            onInstall={handleInstallUpdate}
            onLater={handleDismissUpdate}
            onClose={handleDismissUpdate}
          />
        )}

        <main ref={mainRef} className="flex-1 flex flex-col p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="absolute top-10 right-4">
          <Suspense fallback={<LoadingFallback />}>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </Suspense>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="spinner" ref={spinnerRef}></div>
              <p className="text-gray-800 dark:text-gray-300 font-medium">Downloading file...</p>
              <div ref={progressBarRef}>
                <Suspense fallback={<LoadingFallback />}>
                  <ProgressBar progress={progress} />
                </Suspense>
              </div>
            </div>
          ) : file ? (
            <div className="w-full max-w-2xl flex flex-col items-center space-y-6" ref={fileContentRef}>
              <div className="relative w-full">
                <button
                  onClick={() => setFile(null)}
                  className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
                  aria-label="Close preview"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <Suspense fallback={<LoadingFallback />}>
                  <FilePreview file={file} onPreview={handlePreview} />
                </Suspense>
              </div>
              <Suspense fallback={<LoadingFallback />}>
                <ActionButtons onCopy={handleCopy} onSaveDownload={handleSaveDownload} />
              </Suspense>
            </div>
          ) : (
            <div className="text-center">
              <div className="waiting-container p-8 rounded-lg transition-colors duration-200 file-preview-bg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-blue-500 dark:text-blue-400">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <h3 className="text-lg font-medium mb-2 transition-colors duration-200">Waiting for content...</h3>
                <p className="font-sans font-medium text-gray-900 dark:text-gray-400 mb-4 transition-colors duration-200">
                  This app handles <code className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 px-2 py-1 rounded font-mono text-sm transition-colors duration-200">wab2b-helper:</code> protocol links, from dashboard.wab2b.com.
                </p>
                <div className="font-mono text-sm text-gray-900 dark:text-gray-400 mt-3 transition-colors duration-200">
                  No user input needed - just wait for browser protocol events
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          {toast && (
            <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
              {toast.message}
            </div>
          )}
        </div>
      </main>
      </Suspense>
    </div>
  );
}

export default App;
