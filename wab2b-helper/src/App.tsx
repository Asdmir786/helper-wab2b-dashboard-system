import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { animate, createScope } from "animejs";
import "./App.css";
import React, { Suspense } from "react";
const TitleBar = React.lazy(() => import("./components/TitleBar"));
const FilePreview = React.lazy(() => import("./components/FilePreview"));
const ActionButtons = React.lazy(() => import("./components/ActionButtons"));
const ThemeToggle = React.lazy(() => import("./components/ThemeToggle"));
import SettingsIcon from "./components/SettingsIcon";
import SettingsModal from "./components/SettingsModal";
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
  const mainRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Add toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Add app initialization state
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);
  const [isProcessingDeepLink, setIsProcessingDeepLink] = useState(false);
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

    // Check for updates on app start based on auto-update setting
    const checkUpdatesOnStart = async () => {
      try {
        // Get settings from backend
        const appSettings = await invoke<{ autoUpdate: boolean, betaMode: boolean }>('get_settings');

        // Only check for updates if auto-update is enabled
        if (appSettings.autoUpdate && updateManager.getUpdateState().status === 'idle') {
          // Pass the beta mode setting to the update check
          updateManager.checkForUpdates(false, appSettings.betaMode).catch(console.error);
        }
      } catch (error) {
        console.error('Failed to load settings for update check:', error);
      }
    };

    checkUpdatesOnStart();

    return unsubscribe;
  }, [updateManager]);

  // Initialize theme based on system preference
  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // App initialization effect - ensures all components are ready before processing deep links
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for DOM to be fully ready
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(void 0);
          } else {
            window.addEventListener('load', () => resolve(void 0), { once: true });
          }
        });

        // Additional delay to ensure React components are mounted and ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mark app as initialized
        setIsAppInitialized(true);
        console.log('App initialization complete');
      } catch (error) {
        console.error('App initialization failed:', error);
        setError('Failed to initialize application');
        // Still mark as initialized to prevent hanging
        setIsAppInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Process pending deep link once app is initialized
  useEffect(() => {
    if (isAppInitialized && pendingDeepLink) {
      console.log('Processing pending deep link:', pendingDeepLink);

      // Add a small delay to ensure all React components are fully rendered
      const processPendingLink = async () => {
        try {
          // Focus window when processing pending deep link
          await focusWindow();
          await new Promise(resolve => setTimeout(resolve, 100));
          await handleDeepLinkInternal(pendingDeepLink);
        } catch (error) {
          console.error('Failed to process pending deep link:', error);
          setError(`Failed to process protocol link: ${error instanceof Error ? error.message : error}`);
        } finally {
          setPendingDeepLink(null);
        }
      };

      processPendingLink();
    }
  }, [isAppInitialized, pendingDeepLink]);

  // Initialize animation scope
  useEffect(() => {
    if (!rootRef.current) return;

    // Create animation scope
    scopeRef.current = createScope({
      root: rootRef.current
    }).add(self => {
      // Register reusable animations
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
            backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(226, 232, 240)', // Using --button-bg-light value
            color: isDark ? 'rgb(243, 244, 246)' : 'rgb(15, 23, 42)', // Using --button-text-light value
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
            color: isDark ? 'rgb(243, 244, 246)' : 'rgb(15, 23, 42)', // Using --file-header-text-light value
            easing: 'easeInOutQuad',
            duration: 300
          });
        }

        // Animate generic file preview backgrounds
        const filePreviewBgs = document.querySelectorAll('.file-preview-bg');
        if (filePreviewBgs.length > 0) {
          animate(filePreviewBgs, {
            backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(224, 234, 255)', // Using --file-preview-bg-light value
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

  // Loading state change handler
  useEffect(() => {
    // Handle loading state changes here if needed
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

  // Enhanced deep link listener with proper error handling
  useEffect(() => {
    if (!isTauri) return;

    const setupDeepLinkListener = async () => {
      try {
        const unlisten = await listen<string>("deep-link-received", (event) => {
          console.log('Deep link event received:', event.payload);
          handleDeepLink(event.payload).catch(error => {
            console.error('Failed to handle deep link:', error);
            setError(`Deep link processing failed: ${error.message || error}`);
          });
        });

        return unlisten;
      } catch (error) {
        console.error('Failed to setup deep link listener:', error);
        setError('Failed to setup protocol handler');
        return () => { }; // Return empty cleanup function
      }
    };

    let cleanup: (() => void) | null = null;

    setupDeepLinkListener().then(unlistenFn => {
      cleanup = unlistenFn;
    }).catch(console.error);

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isAppInitialized]); // Re-setup listener when app initialization state changes

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

  // Internal deep link handler with full error handling
  const handleDeepLinkInternal = async (url: string) => {
    if (!isTauri) {
      setError('Tauri not available in web mode');
      return;
    }

    // Prevent concurrent deep link processing
    if (isProcessingDeepLink) {
      console.log('Already processing a deep link, ignoring new request');
      return;
    }

    try {
      setIsProcessingDeepLink(true);
      setLoading(true);
      setError(null);
      setProgress(0);

      console.log('Processing deep link:', url);

      // Validate URL format
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid deep link URL format');
      }

      const actualUrl = url.replace(/^wab2b-helper:\/*/i, '');

      if (!actualUrl) {
        throw new Error('Empty URL after protocol removal');
      }

      // Validate that the URL looks like a valid web URL
      try {
        new URL(actualUrl);
      } catch {
        throw new Error('Invalid URL format');
      }

      console.log('Downloading file from:', actualUrl);

      // Download the file with timeout
      const downloadPromise = invoke<FileInfo>("download_file", { url: actualUrl });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Download timeout after 30 seconds')), 30000);
      });

      const fileInfo = await Promise.race([downloadPromise, timeoutPromise]);

      if (!fileInfo) {
        throw new Error('No file information received');
      }

      setFile(fileInfo);
      console.log('File downloaded successfully:', fileInfo.file_name);

    } catch (err) {
      console.error("Error handling deep link:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to download file: ${errorMessage}`);

      // Show toast notification for better user feedback
      setToast({
        message: `Download failed: ${errorMessage}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
      setIsProcessingDeepLink(false);
    }
  };

  // Function to focus and show the window
  const focusWindow = async () => {
    if (!isTauri) return;

    try {
      const window = getCurrentWindow();

      // Check if window is minimized and unminimize it
      const isMinimized = await window.isMinimized();
      if (isMinimized) {
        await window.unminimize();
      }

      // Check if window is visible and show it if not
      const isVisible = await window.isVisible();
      if (!isVisible) {
        await window.show();
      }

      // Bring to front and focus
      await window.setFocus();

      // Additional focus attempt for better reliability
      await window.setAlwaysOnTop(true);
      await window.setAlwaysOnTop(false);

      console.log('Window focused successfully');
    } catch (error) {
      console.error('Failed to focus window:', error);
      // Fallback: try basic show and focus
      try {
        const window = getCurrentWindow();
        await window.show();
        await window.setFocus();
      } catch (fallbackError) {
        console.error('Fallback window focus also failed:', fallbackError);
      }
    }
  };

  // Public deep link handler with initialization checks
  const handleDeepLink = async (url: string) => {
    console.log('Deep link received:', url, 'App initialized:', isAppInitialized, 'Processing:', isProcessingDeepLink);

    // Focus the window immediately when deep link is received
    // Add a small delay to ensure the system has processed the protocol launch
    setTimeout(() => {
      focusWindow().catch(error => {
        console.error('Failed to focus window on deep link:', error);
      });
    }, 100);

    // If already processing a deep link, ignore new ones to prevent conflicts
    if (isProcessingDeepLink) {
      console.log('Already processing a deep link, ignoring new request');
      return;
    }

    // If app is not yet initialized, queue the deep link for later processing
    if (!isAppInitialized) {
      console.log('App not initialized, queuing deep link for later processing');
      setPendingDeepLink(url);
      return;
    }

    // If app is initialized, process immediately
    await handleDeepLinkInternal(url);
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
    // Skip external open for previewable media types that are handled in the UI (images, video, audio)
    if (
      file.mime_type.startsWith('video/') ||
      file.mime_type.startsWith('image/') ||
      file.mime_type.startsWith('audio/')
    ) {
      return;
    }

    try {
      // For PDF files, use the Rust backend to open them
      if (file.mime_type === 'application/pdf') {
        await invoke("open_file", { path: file.file_path });
      } else {
        // Use the JS API for opener for other files
        await openPath(file.file_path);
      }
    } catch (err) {
      console.error('Error previewing file:', err);
      setError(`Failed to preview file: ${err}`);

      // If opening fails, try to save the file and then open it
      try {
        const savedPath = await invoke<string>("save_file", { id: file.id });
        setToast({ message: `File saved to: ${savedPath}`, type: 'success' });
      } catch (saveErr) {
        console.error('Error saving file:', saveErr);
        setError(`Failed to save file: ${saveErr}`);
      }
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

  // State to control the visibility of the settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
          <div className="absolute top-10 right-4 flex items-center space-x-2">
            <SettingsIcon onClick={() => setShowSettingsModal(true)} isDarkMode={theme === 'dark'} />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          {/* Settings Modal */}
          {showSettingsModal && (
            <SettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              isDarkMode={theme === 'dark'}
              updateManager={updateManager}
            />
          )}

          <div className="flex-1 flex flex-col items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="text-[var(--app-text-light)] dark:text-gray-200 font-medium">Loading...</div>
                <p className="text-[var(--app-text-light)] dark:text-gray-300 font-medium">Downloading file...</p>
                <div ref={progressBarRef} className="w-64">
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
                  <div className="w-full" style={{
                    "--action-button-bg": theme === "dark" ? "rgb(31, 41, 55)" : "var(--button-bg-light)",
                    "--action-button-text": theme === "dark" ? "rgb(243, 244, 246)" : "var(--button-text-light)"
                  } as React.CSSProperties}>
                    <ActionButtons onCopy={handleCopy} onSaveDownload={handleSaveDownload} />
                  </div>
                </Suspense>
              </div>
            ) : (
              <div className="text-center">
                <div className="waiting-container p-8 rounded-lg transition-colors duration-200 file-preview-bg shadow-md border border-[var(--border-light)] dark:border-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-blue-700 dark:text-blue-400">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  <h3 className="text-lg font-semibold mb-2 text-[var(--file-header-text-light)] dark:text-white transition-colors duration-200">Waiting for content...</h3>
                  <p className="font-sans font-medium text-[var(--app-text-light)] dark:text-gray-400 mb-4 transition-colors duration-200">
                    This app handles <code className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 px-2 py-1 rounded font-mono text-sm transition-colors duration-200 border border-blue-200 dark:border-transparent">wab2b-helper:</code> protocol links, from dashboard.wab2b.com.
                  </p>
                  <div className="font-mono text-sm text-[var(--app-text-light)] dark:text-gray-400 mt-3 transition-colors duration-200">
                    No user input needed - just wait for browser protocol events
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="error-message mt-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-800 shadow-sm font-medium">
                {error}
              </div>
            )}
            {toast && (
              <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg border ${toast.type === 'success'
                ? 'bg-green-600 border-green-700 dark:bg-green-500 dark:border-green-600'
                : 'bg-red-600 border-red-700 dark:bg-red-500 dark:border-red-600'
                } text-white font-medium`}>
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
