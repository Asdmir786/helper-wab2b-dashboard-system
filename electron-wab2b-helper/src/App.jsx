import React, { useState, useEffect, useRef } from 'react';
import { animate, createScope, createSpring } from 'animejs';
import path from 'path';

// File preview component
const FilePreview = ({ file }) => {
  if (!file) return null;
  
  switch (file.type) {
    case 'image':
      return (
        <div className="flex flex-col items-center">
          <img 
            src={`file://${file.path}`} 
            alt="Image preview" 
            className="max-w-full max-h-96 rounded-lg shadow-lg" 
          />
          <div className="mt-4 flex space-x-4">
            <button 
              onClick={() => window.electronAPI.copyToClipboard(file.path, file.type)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Copy to Clipboard
            </button>
            <button 
              onClick={() => window.electronAPI.downloadAttachment(file.path, true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Save As...
            </button>
          </div>
        </div>
      );
    case 'video':
      return (
        <div className="flex flex-col items-center">
          <video 
            src={`file://${file.path}`} 
            controls 
            className="max-w-full max-h-96 rounded-lg shadow-lg"
          />
          <div className="mt-4 flex space-x-4">
            <button 
              onClick={() => window.electronAPI.copyToClipboard(file.path, file.type)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Copy to Clipboard
            </button>
            <button 
              onClick={() => window.electronAPI.downloadAttachment(file.path, true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Save As...
            </button>
          </div>
        </div>
      );
    case 'document':
      return (
        <div className="flex flex-col items-center bg-gray-100 dark:bg-gray-800 p-8 rounded-lg">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-lg font-medium mb-4">{file.name}</p>
          <div className="mt-4 flex space-x-4">
            <button 
              onClick={() => window.electronAPI.copyToClipboard(file.path, file.type)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Copy to Clipboard
            </button>
            <button 
              onClick={() => window.electronAPI.downloadAttachment(file.path, true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Save As...
            </button>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center bg-gray-100 dark:bg-gray-800 p-8 rounded-lg">
          <div className="text-6xl mb-4">🗂️</div>
          <p className="text-lg font-medium mb-4">{file.name}</p>
          <div className="mt-4 flex space-x-4">
            <button 
              onClick={() => window.electronAPI.downloadAttachment(file.path, true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Save As...
            </button>
          </div>
        </div>
      );
  }
};

// Main application component
function App() {
  // State for light/dark mode
  const [darkMode, setDarkMode] = useState(false);
  
  // State for file handling
  const [currentFile, setCurrentFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // Create refs for our root element
  const rootRef = useRef(null);
  const scopeRef = useRef(null);
  
  // Effect to detect system theme preference
  useEffect(() => {
    // Check for system theme preference via Electron API
    const getInitialTheme = async () => {
      if (window.electronAPI) {
        const systemTheme = await window.electronAPI.getSystemTheme();
        setDarkMode(systemTheme === 'dark');
        
        // Listen for theme changes
        window.electronAPI.onThemeChange((theme) => {
          setDarkMode(theme === 'dark');
        });
      }
    };
    
    getInitialTheme();
  }, []);
  
  // Effect to handle protocol links
  useEffect(() => {
    // Function to handle wab2b-helper protocol URLs
    const handleProtocolUrls = async (url) => {
      if (!url || !url.startsWith('wab2b-helper://')) return;
      
      // Clean up previous file if it exists
      if (currentFile?.cleanup) {
        currentFile.cleanup();
      }
      
      setIsProcessing(true);
      setError(null);
      
      try {
        // Use the electronAPI to handle the attachment
        const result = await window.electronAPI.handleAttachment(url, {
          filename: new URL(url).pathname.split('/').pop() || 'attachment' // Extract filename from URL using modern URL API
        });
        
        if (result.success) {
          setCurrentFile({
            path: result.filePath,
            type: result.fileType,
            name: result.name || path.basename(result.filePath)
          });
        } else {
          setError(result.error || 'Failed to process attachment');
        }
      } catch (err) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Check for protocol URLs in the arguments when the app starts
    if (window.location.href.startsWith('wab2b-helper://')) {
      handleProtocolUrls(window.location.href);
    }
    
    // Listen for protocol URL events from the main process
    let cleanup;
    if (window.electronAPI) {
      cleanup = window.electronAPI.onProtocolUrl(handleProtocolUrls);
    }
    
    // Also listen for browser protocol URL navigation events (for web testing)
    window.addEventListener('protocol-url', (event) => {
      handleProtocolUrls(event.detail.url);
    });
    
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('protocol-url', handleProtocolUrls);
    };
  }, []);
  
  // Setup animations using createScope for proper scoping and cleanup
  useEffect(() => {
    // Create a scope for all animations
    scopeRef.current = createScope({ root: rootRef }).add(self => {
      // Animate the title with a bounce effect
      animate('.app-title', {
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [
          { to: 1.05, ease: 'inOut(3)', duration: 200 },
          { to: 1, ease: createSpring({ stiffness: 300 }) }
        ],
        duration: 800,
        easing: 'easeOutExpo',
      });
      
      // Animate the cards with a staggered effect
      animate('.card', {
        opacity: [0, 1],
        translateY: [40, 0],
        scale: [0.9, 1],
        delay: function(el, i) { return i * 150 },
        duration: 800,
        easing: 'easeOutExpo',
      });
      
      // Register functions to be used outside of the scope
      self.add('animateThemeToggle', () => {
        animate('.app-container', {
          opacity: [0.8, 1],
          scale: [0.98, 1],
          duration: 300,
          easing: 'easeOutQuad',
        });
      });
      
      // Animation for file preview
      self.add('animateFilePreview', () => {
        animate('.file-preview', {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 400,
          easing: 'easeOutQuad',
        });
      });
    });
    
    // Properly cleanup all anime.js instances declared inside the scope
    return () => scopeRef.current.revert();
  }, []);
  
  // Effect to animate file preview when it changes
  useEffect(() => {
    if (currentFile && scopeRef.current?.methods) {
      scopeRef.current.methods.animateFilePreview();
    }
  }, [currentFile]);
  
  // Toggle theme function with animation
  const toggleDarkMode = () => {
    // Use the registered method from the scope
    if (scopeRef.current?.methods) {
      scopeRef.current.methods.animateThemeToggle();
    }
    setDarkMode(!darkMode);
  };
  
  // Handle test file upload
  const handleTestFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create an object URL but ensure to revoke it when no longer needed
      const objectUrl = URL.createObjectURL(file);
      
      setCurrentFile({
        path: objectUrl,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 
              file.type.startsWith('application/pdf') ? 'document' : 'unknown',
        name: file.name,
        // Add a cleanup function to revoke the object URL
        cleanup: () => URL.revokeObjectURL(objectUrl)
      });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`} ref={rootRef}>
      <div className="app-container bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen transition-colors duration-300">
        <header className="border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto p-4 flex justify-between items-center">
            <h1 className="app-title text-2xl font-bold">
              WaB2B Helper Dashboard
            </h1>
            <button 
              onClick={toggleDarkMode} 
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {darkMode ? '🌞 Light' : '🌙 Dark'}
            </button>
          </div>
        </header>
        
        <main className="container mx-auto p-4">
          {currentFile ? (
            <div className="file-preview mb-8">
              <h2 className="text-xl font-semibold mb-4">File Preview</h2>
              <FilePreview file={currentFile} />
              
              <button 
                onClick={() => {
                  // Clean up object URL if it exists to prevent memory leaks
                  if (currentFile.cleanup) {
                    currentFile.cleanup();
                  }
                  setCurrentFile(null);
                }} 
                className="mt-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              <div className="card bg-gray-100 dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">About this App</h2>
                <p className="mb-4">
                  This application handles attachments when the custom <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">wab2b-helper:</code> protocol is used.
                </p>
                <p className="mb-4">
                  It supports various file types including documents, images, videos, and more.
                </p>
                
                {/* Test file uploader for development */}
                <div className="mt-6 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Test with a local file</h3>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    For testing purposes, you can upload a file directly:
                  </p>
                  <input 
                    type="file" 
                    onChange={handleTestFile}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                             file:mr-4 file:py-2 file:px-4
                             file:rounded-lg file:border-0
                             file:text-sm file:font-semibold
                             file:bg-gray-200 file:text-gray-700
                             dark:file:bg-gray-700 dark:file:text-gray-200
                             hover:file:bg-gray-300 dark:hover:file:bg-gray-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* File types supported */}
                <div className="card bg-gray-100 dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:scale-105 transition-transform">
                  <h3 className="text-lg font-semibold mb-2">Documents</h3>
                  <p>Support for PDF, DOCX, Excel, and plain text files</p>
                </div>
                
                <div className="card bg-gray-100 dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:scale-105 transition-transform">
                  <h3 className="text-lg font-semibold mb-2">Images</h3>
                  <p>Preview and save JPG, PNG, GIF, and other image formats</p>
                </div>
                
                <div className="card bg-gray-100 dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:scale-105 transition-transform">
                  <h3 className="text-lg font-semibold mb-2">Videos</h3>
                  <p>Built-in player for MP4, WebM, and other video formats</p>
                </div>
              </div>
            </>
          )}
          
          {isProcessing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
                <p className="text-lg font-medium">Processing...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Error</h3>
              <p>{error}</p>
            </div>
          )}
        </main>
        
        <footer className="container mx-auto p-4 border-t border-gray-200 dark:border-gray-700 mt-8">
          <p className="text-center text-gray-500 dark:text-gray-400">
            WaB2B Helper Dashboard &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App; 