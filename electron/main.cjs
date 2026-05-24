const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 判断是否为开发模式
const isDev = !app.isPackaged;

let loginWindow = null;
let mainWindow = null;

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 520,
    height: 680,
    resizable: false,
    frame: false,            // 无边框
    transparent: false,      // 有背景色
    backgroundColor: '#0B0F1A',
    icon: path.join(__dirname, '..', 'app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 居中显示
  loginWindow.center();

  if (isDev) {
    loginWindow.loadURL('http://localhost:5173/');
    loginWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    loginWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: true,             // 主窗口有边框
    icon: path.join(__dirname, '..', 'app.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.center();
  mainWindow.setTitle('经侦大队工作记录管理系统');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 从渲染进程接收：切换窗口
ipcMain.on('switch-to-main', () => {
  if (loginWindow) {
    loginWindow.close();
  }
  createMainWindow();
});

ipcMain.on('close-login', () => {
  if (loginWindow) {
    loginWindow.close();
  }
});

app.whenReady().then(() => {
  createLoginWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow();
  }
});
