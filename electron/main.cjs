const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
let appWindow = null;

// 移除默认菜单栏
Menu.setApplicationMenu(null);

function createWindow() {
  appWindow = new BrowserWindow({
    width: 660,
    height: 720,
    resizable: true,
    frame: false,           // 无边框窗口（无标题栏、无菜单栏）
    backgroundColor: "#0B0F1A",
    icon: path.join(__dirname, "..", "app.ico"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  appWindow.center();

  if (isDev) {
    appWindow.loadURL("http://localhost:5173/");
  } else {
    appWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  appWindow.once("ready-to-show", () => {
    appWindow.show();
  });

  appWindow.on("closed", () => {
    appWindow = null;
  });
}

// 登录成功后：放大窗口（无边框无菜单栏）
ipcMain.on("switch-to-main", () => {
  if (!appWindow) return;
  appWindow.setMinimumSize(1100, 700);
  appWindow.setSize(1400, 900);
  appWindow.center();
  appWindow.setResizable(true);
});

ipcMain.on("close-login", () => {
  if (appWindow) appWindow.close();
});

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});