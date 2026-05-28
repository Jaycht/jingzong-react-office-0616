const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const isDev = !app.isPackaged;
let mainWindow = null;

// 窗口尺寸常量
const LOGIN_SIZE = { width: 974, height: 711 };
const MAIN_SIZE = { width: 1400, height: 900 };
const MAIN_MIN = { minWidth: 1100, minHeight: 700 };

// 附件存储目录
const ATTACHMENTS_DIR = path.join(app.getPath("userData"), "attachments");

// 移除默认菜单栏（全局生效）
Menu.setApplicationMenu(null);

function createWindow() {
  mainWindow = new BrowserWindow({
    ...LOGIN_SIZE,
    resizable: true,
    frame: false,
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
    mainWindow.loadURL("http://localhost:5173/");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ======================== IPC 处理器 ========================

// 单窗口大小调整：登录态 → 主页态
ipcMain.on("resize-to-main", () => {
  if (mainWindow) {
    mainWindow.setMinimumSize(MAIN_MIN.minWidth, MAIN_MIN.minHeight);
    mainWindow.setSize(MAIN_SIZE.width, MAIN_SIZE.height);
    mainWindow.center();
  }
});

// 单窗口大小调整：主页态 → 登录态
ipcMain.on("resize-to-login", () => {
  if (mainWindow) {
    mainWindow.setMinimumSize(LOGIN_SIZE.width, LOGIN_SIZE.height);
    mainWindow.setSize(LOGIN_SIZE.width, LOGIN_SIZE.height);
    mainWindow.center();
  }
});

// 窗口控制 — 使用 event.sender 获取准确的窗口引用
function getWin(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.on("window-minimize", (event) => {
  const win = getWin(event);
  if (win) win.minimize();
});

ipcMain.on("window-maximize", (event) => {
  const win = getWin(event);
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on("window-close", (event) => {
  const win = getWin(event);
  if (win) win.close();
});

// 附件文件操作 — 保存文件到硬盘
ipcMain.handle("save-attachment-file", async (_event, { buffer, fileName, moduleId }) => {
  try {
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName.replace(/[<>:"/\\|?*]/g, "_")}`;
    const filePath = path.join(ATTACHMENTS_DIR, safeName);
    await fsp.writeFile(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 附件文件操作 — 从硬盘读取文件
ipcMain.handle("read-attachment-file", async (_event, filePath) => {
  try {
    const buffer = await fsp.readFile(filePath);
    const uint8 = new Uint8Array(buffer);
    return { success: true, buffer: uint8.buffer };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 附件文件操作 — 从硬盘删除文件
ipcMain.handle("delete-attachment-file", async (_event, filePath) => {
  try {
    await fsp.unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 获取附件目录路径
ipcMain.handle("get-attachments-dir", () => {
  return ATTACHMENTS_DIR;
});

// 弹出保存文件对话框（下载附件时使用）
ipcMain.handle("show-save-dialog", async (_event, { defaultName, buffer }) => {
  try {
    const result = await dialog.showSaveDialog({
      title: "保存附件",
      defaultPath: path.join(app.getPath("downloads"), defaultName),
      filters: [{ name: "所有文件", extensions: ["*"] }],
    });
    if (result.canceled) return { success: false, canceled: true };
    await fsp.writeFile(result.filePath, Buffer.from(buffer));
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  // 确保附件目录存在
  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
