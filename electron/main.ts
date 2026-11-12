import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { createServer } from '../backend/src/server';

let mainWindow: BrowserWindow | null = null;
let serverInstance: any = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PORT = 3002;

function startBackend() {
  try {
    const { app: expressApp } = createServer();
    serverInstance = expressApp.listen(PORT, '127.0.0.1', () => {
      console.log(`[Electron Main] Backend SQLite ativo internamente na porta ${PORT}`);
    });
  } catch (err) {
    console.error('[Electron Main] Erro ao iniciar backend embutido:', err);
  }
}

function createWindow() {
  // Security: Apply Content Security Policy (CSP) & Deny Remote Permissions
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob: http://localhost:3001 http://localhost:3002 https://images.unsplash.com https://fonts.googleapis.com https://fonts.gstatic.com;"
        ],
      },
    });
  });

  // Allow camera media permission for gate QR scanning, deny all other unneeded requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
      return;
    }
    callback(false);
  });

  // Explicitly allow USB and HID hardware devices (barcode readers, USB hardware)
  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'hid' || details.deviceType === 'usb') {
      return true;
    }
    return false;
  });


  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Portaria Escolar Local-First - Controle de Acesso',
    backgroundColor: '#f4f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  // Deny opening unmanaged child windows / popups
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001/?tab=portaria');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 1. Inicia backend SQLite embutido
  startBackend();

  // 2. Abre a interface desktop
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:is-packaged', () => app.isPackaged);
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());

