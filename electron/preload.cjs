const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口切换
  switchToMain: () => ipcRenderer.send('switch-to-main'),
  closeLogin: () => ipcRenderer.send('close-login'),
  logoutToLogin: () => ipcRenderer.send('logout-to-login'),
  isElectron: true,

  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // 附件文件操作（异步返回 Promise）
  saveAttachmentFile: (buffer, fileName, moduleId) =>
    ipcRenderer.invoke('save-attachment-file', { buffer, fileName, moduleId }),
  readAttachmentFile: (filePath) =>
    ipcRenderer.invoke('read-attachment-file', filePath),
  deleteAttachmentFile: (filePath) =>
    ipcRenderer.invoke('delete-attachment-file', filePath),
  getAttachmentsDir: () =>
    ipcRenderer.invoke('get-attachments-dir'),
  showSaveDialog: (defaultName, buffer) =>
    ipcRenderer.invoke('show-save-dialog', { defaultName, buffer }),
});
