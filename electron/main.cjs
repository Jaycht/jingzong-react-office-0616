const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const isDev = !app.isPackaged;
let mainWindow = null;
let autoUpdater = null;

// 尝试加载 electron-updater（生产环境可选）
if (!isDev) {
  try {
    const { autoUpdater: updater } = require("electron-updater");
    autoUpdater = updater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
  } catch {
    // electron-updater 未安装，跳过自动更新
  }
}

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

/** 校验路径位于附件目录下，防止渲染进程访问任意磁盘文件 */
function safePath(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(ATTACHMENTS_DIR))) {
    throw new Error('Access denied: path outside attachments directory');
  }
  return resolved;
}

// 附件文件操作 — 从硬盘读取文件
ipcMain.handle("read-attachment-file", async (_event, filePath) => {
  try {
    const resolved = safePath(filePath);
    const buffer = await fsp.readFile(resolved);
    const uint8 = new Uint8Array(buffer);
    return { success: true, buffer: uint8.buffer };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 附件文件操作 — 从硬盘删除文件
ipcMain.handle("delete-attachment-file", async (_event, filePath) => {
  try {
    const resolved = safePath(filePath);
    await fsp.unlink(resolved);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 获取附件目录路径
ipcMain.handle("get-attachments-dir", () => {
  return ATTACHMENTS_DIR;
});

// 获取文档文件夹路径（用于默认备份路径）
ipcMain.handle("get-documents-dir", () => {
  return app.getPath("documents");
});

// 检查附件文件是否存在
ipcMain.handle("check-attachment-file", async (_event, filePath) => {
  try {
    const resolved = safePath(filePath);
    const exists = fs.existsSync(resolved);
    return { success: true, exists };
  } catch (err) {
    return { success: false, exists: false, error: err.message };
  }
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

// ======================== 自动更新 ========================

ipcMain.handle("check-for-updates", async () => {
  if (!autoUpdater) return { available: false, error: "auto-updater not available" };
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      return {
        available: true,
        version: result.updateInfo.version,
        releaseNotes: result.updateInfo.releaseNotes || "",
      };
    }
    return { available: false };
  } catch (err) {
    return { available: false, error: err.message };
  }
});

ipcMain.handle("download-update", async () => {
  if (!autoUpdater) return { success: false, error: "auto-updater not available" };
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("install-update", () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall(false, true);
  }
});

// 自动更新事件转发到渲染进程
if (autoUpdater) {
  autoUpdater.on("update-available", (info) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-available", { version: info.version });
    }
  });
  autoUpdater.on("download-progress", (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-progress", { percent: progress.percent });
    }
  });
  autoUpdater.on("update-downloaded", () => {
    if (mainWindow) {
      mainWindow.webContents.send("update-downloaded");
    }
  });
}

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
