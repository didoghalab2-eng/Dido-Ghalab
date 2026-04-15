const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const express = require('express');
const isDev = process.env.NODE_ENV === 'development';

let server;

function startLocalServer() {
  const webApp = express();
  const distPath = path.join(__dirname, '../dist');
  
  console.log("Checking dist path:", distPath);
  
  webApp.use(express.static(distPath));
  
  webApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return new Promise((resolve, reject) => {
    // Try fixed port first, then random
    const preferredPort = 5858;
    const s = webApp.listen(preferredPort, '127.0.0.1', () => {
      console.log(`Production server running on http://127.0.0.1:${preferredPort}`);
      resolve({ server: s, port: preferredPort });
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const randomS = webApp.listen(0, '127.0.0.1', () => {
          const port = randomS.address().port;
          console.log(`Preferred port busy, using random port: ${port}`);
          resolve({ server: randomS, port });
        });
      } else {
        reject(err);
      }
    });
  });
}

async function createWindow() {
  let port = 3000;
  
  if (!isDev) {
    try {
      const serverInfo = await startLocalServer();
      server = serverInfo.server;
      port = serverInfo.port;
    } catch (e) {
      console.error("CRITICAL: Failed to start local server", e);
    }
  }

  // Set global User-Agent to bypass Google Auth blocks
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:main',
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    title: "Alamed Management System v2.0.4",
    autoHideMenuBar: true
  });

  // Force DevTools to open in production for debugging
  win.webContents.on('did-finish-load', () => {
    win.webContents.openDevTools({ mode: 'detach' });
    console.log("App loaded successfully");
  });

  // Handle Firebase Auth Popups
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log("Opening popup for URL:", url);
    return { 
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: 'persist:main',
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }
    };
  });

  const url = isDev ? 'http://localhost:3000' : (server ? `http://127.0.0.1:${port}` : `file://${path.join(__dirname, '../dist/index.html')}`);
  console.log("Loading URL:", url);
  win.loadURL(url);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
