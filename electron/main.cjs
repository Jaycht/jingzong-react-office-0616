const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
let loginWindow = null;
let mainWindow = null;

// 移除默认菜单栏（全局生效）
Menu.setApplicationMenu(null);

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 660,
    height: 720,
    resizable: true,
    frame: false,           // 登录页：完全无边框
    backgroundColor: "#0B0F1A",
    icon: path.join(__dirname, "..", "app.ico"),
    show: false,
    title: "经侦大队工作记录管理系统",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loginWindow.center();

  if (isDev) {
    loginWindow.loadURL("http://localhost:5173/");
  } else {
    loginWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  loginWindow.once("ready-to-show", () => {
    loginWindow.show();
  });

  loginWindow.on("closed", () => {
    loginWindow = null;
  });
}

function createMainWindow() {
  const hash = "#/app/dashboard";
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    resizable: true,
    frame: false,               // 保持无边框，侧边栏已含拖拽区
    backgroundColor: "#0B0F1A",
    icon: path.join(__dirname, "..", "app.ico"),
    show: false,
    title: "经侦大队工作记录管理系统",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.center();

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173/#/app/dashboard");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), { hash: "/app/dashboard" });
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 登录成功后：关闭登录窗口，打开主窗口
ipcMain.on("switch-to-main", () => {
  if (loginWindow) {
    loginWindow.close();
    loginWindow = null;
  }
  createMainWindow();
});

ipcMain.on("close-login", () => {
  if (loginWindow) loginWindow.close();
});

app.whenReady().then(() => {
  createLoginWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createLoginWindow();
});
