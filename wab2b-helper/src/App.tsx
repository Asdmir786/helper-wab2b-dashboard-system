import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { animate, createScope } from "animejs";
import "./App.css";
import TitleBar from "./components/TitleBar";
import FilePreview from "./components/FilePreview";
import ActionButtons from "./components/ActionButtons";
import ThemeToggle from "./components/ThemeToggle";
import ProgressBar from "./components/ProgressBar";
import packageJson from "../package.json";

// Types
interface FileInfo {
  id: string;
  original_url: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size: number;
}

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
            backgroundColor: isDark ? 'rgb(55, 65, 81)' : 'rgb(248, 250, 252)',
            color: isDark ? 'rgb(249, 250, 251)' : 'rgb(51, 65, 85)',
            easing: 'easeInOutQuad',
            duration: 300
          });
        }
        
        const saveButtons = document.querySelectorAll('.action-button-save');
        if (saveButtons.length > 0) {
          animate(saveButtons, {
            backgroundColor: isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)',
            color: '#ffffff',
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

  // Listen for deep link events
  useEffect(() => {
    const unlisten = listen<string>("deep-link-received", (event) => {
      handleDeepLink(event.payload);
    });

    return () => {
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, []);

  // Listen for download progress
  useEffect(() => {
    const unlisten = listen<number>("download-progress", (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const unlisten = listen<string>("theme-changed", (event) => {
      const newTheme = event.payload as "light" | "dark";
      setTheme(newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    });

    return () => {
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, []);

  // Handle deep link
  const handleDeepLink = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      
      // Download the file
      const fileInfo = await invoke<FileInfo>("download_file", { url });
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
    
    await invoke("set_theme", { theme: newTheme });
  };

  // Copy file to clipboard
  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!file) return;
    
    try {
      await invoke("copy_to_clipboard", { id: file.id });
      
      // Add a visual feedback animation
      if (scopeRef.current?.methods) {
        scopeRef.current.methods.buttonFeedback(e.currentTarget);
      }
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      setError(`Failed to copy file: ${err}`);
    }
  };

  // Save and download file
  const handleSaveDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!file) return;
    
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
    if (!file) return;
    
    try {
      // Use the Tauri plugin opener to open the file
      await invoke("plugin:opener|open", { path: file.file_path });
    } catch (err) {
      console.error("Error previewing file:", err);
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

  return (
    <div className={`flex flex-col h-full w-full ${theme === "dark" ? "dark" : ""}`} ref={rootRef}>
      <TitleBar version={packageJson.version} isDarkMode={theme === 'dark'} />
      
      <main ref={mainRef} className="flex-1 flex flex-col p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="absolute top-10 right-4">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="spinner" ref={spinnerRef}></div>
              <p className="text-gray-800 dark:text-gray-300 font-medium">Downloading file...</p>
              <div ref={progressBarRef}>
                <ProgressBar progress={progress} />
              </div>
            </div>
          ) : file ? (
            <div className="w-full max-w-2xl flex flex-col items-center space-y-6" ref={fileContentRef}>
              <FilePreview file={file} onPreview={handlePreview} />
              <ActionButtons onCopy={handleCopy} onSaveDownload={handleSaveDownload} />
            </div>
          ) : (
            <div className="text-center">
              <div className="waiting-container p-8 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-blue-500">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <h3 className="text-lg font-medium mb-2">Waiting for content...</h3>
                <p className="font-sans font-medium text-gray-900 dark:text-gray-400 mb-4">
                  This app handles <code className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 px-2 py-1 rounded font-mono text-sm">wab2b-helper:</code> protocol links.
                </p>
                <div className="font-mono text-sm text-gray-900 dark:text-gray-400 mt-3">
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
        </div>
      </main>
    </div>
  );
}

export default App;
