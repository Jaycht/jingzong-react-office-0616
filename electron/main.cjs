const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
let appWindow = null;

function createWindow() {
  appWindow = new BrowserWindow({
    width: 520,
    height: 720,
    resizable: true,
    frame: true,
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

// 登录成功后：放大窗口、改标题（不关窗不重开）
ipcMain.on("switch-to-main", () => {
  if (!appWindow) return;
  appWindow.setMinimumSize(1100, 700);
  appWindow.setSize(1400, 900);
  appWindow.center();
  appWindow.setResizable(true);
  appWindow.setTitle("\u7ecf\u4fde\u5927\u961f\u5de5\u4f5c\u8bb0\u5f55\u7ba1\u7406\u7cfb\u7edf");
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
