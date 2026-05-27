const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const isDev = !app.isPackaged;
let loginWindow = null;
let mainWindow = null;

// 附件存储目录
const ATTACHMENTS_DIR = path.join(app.getPath("userData"), "attachments");

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

// ======================== IPC 处理器 ========================

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

// 窗口控制 — 使用 event.sender 获取准确的窗口引用（比跟踪变量更可靠）
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
    // Buffer → Uint8Array → ArrayBuffer（确保 IPC 序列化正确）
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

app.whenReady().then(() => {
  // 确保附件目录存在
  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
  createLoginWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createLoginWindow();
});
