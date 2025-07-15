import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import TitleBar from "./components/TitleBar";
import FilePreview from "./components/FilePreview";
import ActionButtons from "./components/ActionButtons";
import ThemeToggle from "./components/ThemeToggle";
import DropZone from "./components/DropZone";
import ProgressBar from "./components/ProgressBar";

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

  // Initialize theme based on system preference
  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

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

  // Handle file drop
  const handleFileDrop = async (url: string) => {
    await handleDeepLink(url);
  };

  // Toggle theme
  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    await invoke("set_theme", { theme: newTheme });
  };

  // Copy file to clipboard
  const handleCopy = async () => {
    if (!file) return;
    
    try {
      await invoke("copy_to_clipboard", { id: file.id });
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      setError(`Failed to copy file: ${err}`);
    }
  };

  // Save and download file
  const handleSaveDownload = async () => {
    if (!file) return;
    
    try {
      await invoke("save_file", { id: file.id });
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

  return (
    <div className={`flex flex-col h-full w-full ${theme === "dark" ? "dark" : ""}`}>
      <TitleBar />
      
      <main className="flex-1 flex flex-col p-4 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-300">
        <div className="absolute top-4 right-4">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="spinner"></div>
              <p>Downloading file...</p>
              <ProgressBar progress={progress} />
            </div>
          ) : file ? (
            <div className="w-full max-w-2xl flex flex-col items-center space-y-6 slide-up">
              <FilePreview file={file} onPreview={handlePreview} />
              <ActionButtons onCopy={handleCopy} onSaveDownload={handleSaveDownload} />
            </div>
          ) : (
            <DropZone onDrop={handleFileDrop} />
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
