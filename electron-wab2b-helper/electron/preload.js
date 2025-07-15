const { contextBridge, ipcRenderer } = require('electron');

// Define all API functions we want to expose to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // File handling for wab2b-helper: protocol
  handleAttachment: (url, options) => {
    return ipcRenderer.invoke('handle-attachment', url, options);
  },
  
  // Show options for attachment
  showAttachmentOptions: (filePath, fileType) => {
    return ipcRenderer.invoke('show-attachment-options', filePath, fileType);
  },
  
  // Downloading attachment
  downloadAttachment: (url, saveAs) => {
    return ipcRenderer.invoke('download-attachment', url, saveAs);
  },
  
  // Copy to clipboard functionality
  copyToClipboard: (filePath, fileType) => {
    return ipcRenderer.invoke('copy-to-clipboard', filePath, fileType);
  },
  
  // System theme detection
  getSystemTheme: () => {
    return ipcRenderer.invoke('get-system-theme');
  },
  
  // Event listeners
  onThemeChange: (callback) => {
    ipcRenderer.on('theme-changed', (_, theme) => callback(theme));
    return () => {
      ipcRenderer.removeListener('theme-changed', callback);
    };
  },
  
  // Protocol URL listener
  onProtocolUrl: (callback) => {
    const protocolUrlHandler = (_, url) => callback(url);
    ipcRenderer.on('protocol-url-received', protocolUrlHandler);
    return () => {
      ipcRenderer.removeListener('protocol-url-received', protocolUrlHandler);
    };
  }
}); 