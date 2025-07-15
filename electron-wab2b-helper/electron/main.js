const { app, BrowserWindow, protocol, shell, ipcMain, clipboard, dialog, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
// Use node's newer URL API instead of deprecated url.parse
const { URL } = require('url');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Force single instance of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // If another instance tries to launch, focus our window instead
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Parse the URL from commandLine and send to renderer
      const protocolUrl = commandLine.find(arg => arg.startsWith('wab2b-helper://'));
      if (protocolUrl) {
        mainWindow.webContents.send('protocol-url-received', protocolUrl);
      }
    }
  });
}

// Store main window reference
let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open the DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

// Register the wab2b-helper protocol
const registerProtocol = () => {
  // Register standard protocol handler
  app.setAsDefaultProtocolClient('wab2b-helper');
  
  // Register the wab2b-helper protocol with the system
  protocol.handle('wab2b-helper', (request) => {
    try {
      // Parse the URL from the request using the modern URL API
      const urlObj = new URL(request.url);
      const filePath = decodeURIComponent(urlObj.pathname);
      
      // Normalize the path
      const normalizedPath = path.normalize(filePath);
      return new Response(fs.createReadStream(normalizedPath));
    } catch (error) {
      console.error('Error handling wab2b-helper protocol:', error);
      return new Response(null, { status: 404 });
    }
  });
};

// Setup IPC handlers for clipboard operations
const setupIPCHandlers = () => {
  // Handle attachment requests from the renderer
  ipcMain.handle('handle-attachment', async (event, attachmentUrl, options) => {
    try {
      // Parse the URL to determine if it's a local file or remote URL
      let urlObj;
      try {
        urlObj = new URL(attachmentUrl);
      } catch (e) {
        // If URL parsing fails, assume it's a local file path
        urlObj = { protocol: 'file:' };
      }
      
      const isRemote = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      
      let filePath;
      if (isRemote) {
        // Download the file to a temporary location
        const tempDir = app.getPath('temp');
        const fileName = options.filename || 'attachment';
        filePath = path.join(tempDir, fileName);
        await downloadFile(attachmentUrl, filePath);
      } else {
        // Handle local file (already on disk)
        filePath = path.normalize(attachmentUrl.replace('wab2b-helper://', ''));
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error('File not found');
        }
      }
      
      // Return the file path and determine file type
      const fileType = getFileType(filePath);
      const fileName = path.basename(filePath);
      return { success: true, filePath, fileType, name: fileName };
    } catch (error) {
      console.error('Error handling attachment:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handle attachment options
  ipcMain.handle('show-attachment-options', async (event, filePath, fileType) => {
    // Return available options based on file type
    return {
      canPreview: ['image', 'video', 'pdf'].includes(fileType),
      canCopy: ['image', 'video', 'text'].includes(fileType),
      canDownload: true,
    };
  });
  
  // Handle copy to clipboard
  ipcMain.handle('copy-to-clipboard', async (event, filePath, fileType) => {
    try {
      if (fileType === 'image') {
        // For images, copy as image
        const image = nativeImage.createFromPath(filePath);
        clipboard.writeImage(image);
        return { success: true };
      } else if (fileType === 'video') {
        // For videos, we copy the file path as it's not possible to directly copy video content
        clipboard.writeText(filePath);
        return { success: true, message: 'Video file path copied to clipboard' };
      } else if (fileType === 'text') {
        // For text files, read and copy the content
        const content = await fs.promises.readFile(filePath, 'utf8');
        clipboard.writeText(content);
        return { success: true };
      } else {
        // For other file types, copy the file path
        clipboard.writeText(filePath);
        return { success: true, message: 'File path copied to clipboard' };
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handle downloading attachments
  ipcMain.handle('download-attachment', async (event, attachmentUrl, saveAs = true) => {
    try {
      // Extract file name from URL or path
      let fileName;
      if (typeof attachmentUrl === 'string') {
        try {
          const urlObj = new URL(attachmentUrl);
          fileName = path.basename(urlObj.pathname || 'attachment');
        } catch (e) {
          // If URL parsing fails, just use the path basename
          fileName = path.basename(attachmentUrl);
        }
      } else {
        fileName = 'attachment';
      }
      
      if (saveAs) {
        // Show save dialog
        const { canceled, filePath } = await dialog.showSaveDialog({
          defaultPath: fileName,
        });
        
        if (canceled) {
          return { success: false, canceled: true };
        }
        
        // If it's a local file, copy it
        if (typeof attachmentUrl === 'string' && !attachmentUrl.startsWith('http')) {
          await fs.promises.copyFile(attachmentUrl, filePath);
          return { success: true, filePath };
        }
        
        // If it's a remote file, download it
        await downloadFile(attachmentUrl, filePath);
        return { success: true, filePath };
      } else {
        // Download to downloads folder without prompt
        const downloadsPath = app.getPath('downloads');
        const filePath = path.join(downloadsPath, fileName);
        
        if (typeof attachmentUrl === 'string' && !attachmentUrl.startsWith('http')) {
          await fs.promises.copyFile(attachmentUrl, filePath);
        } else {
          await downloadFile(attachmentUrl, filePath);
        }
        
        return { success: true, filePath };
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get system theme
  ipcMain.handle('get-system-theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });
  
  // Forward theme changes to renderer
  nativeTheme.on('updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });
};

// Helper function to download a file using modern async/await and promises
async function downloadFile(fileUrl, destPath) {
  // Use node-fetch or a similar library in a real app, but for simplicity:
  const urlObj = new URL(fileUrl);
  const protocol = urlObj.protocol === 'https:' ? https : http;
  
  return new Promise((resolve, reject) => {
    const request = protocol.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
      
      file.on('error', async (err) => {
        // Close the file
        file.close();
        
        // Delete the file asynchronously
        try {
          await fs.promises.unlink(destPath);
        } catch (unlinkErr) {
          // Ignore errors when removing the file
        }
        
        reject(err);
      });
    });
    
    request.on('error', async (err) => {
      try {
        await fs.promises.unlink(destPath).catch(() => {});
      } catch (unlinkErr) {
        // Ignore errors when removing the file
      }
      reject(err);
    });
  });
}

// Helper function to determine file type
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  const textExts = ['.txt', '.md', '.json', '.csv', '.html', '.xml', '.js', '.css'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (docExts.includes(ext)) return 'document';
  if (textExts.includes(ext)) return 'text';
  
  return 'unknown';
}

// Handle protocol URLs from launch arguments (Windows)
const handleProtocolArgs = () => {
  // For Windows: handle deep linking through protocol handler
  if (process.platform === 'win32') {
    const protocolUrl = process.argv.find(arg => arg.startsWith('wab2b-helper://'));
    if (protocolUrl && mainWindow) {
      mainWindow.webContents.send('protocol-url-received', protocolUrl);
    }
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  registerProtocol();
  setupIPCHandlers();
  createWindow();
  handleProtocolArgs();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// For macOS: handle open-url events for protocol handling
app.on('open-url', (event, url) => {
  event.preventDefault();
  
  // If the app is not ready yet, wait until it is
  if (!app.isReady()) {
    app.once('ready', () => {
      // Ensure mainWindow exists before trying to send message
      if (mainWindow) {
        mainWindow.webContents.send('protocol-url-received', url);
      }
    });
  } else if (mainWindow) {
    mainWindow.webContents.send('protocol-url-received', url);
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 