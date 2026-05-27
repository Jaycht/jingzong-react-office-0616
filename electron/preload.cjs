const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  switchToMain: () => ipcRenderer.send('switch-to-main'),
  closeLogin: () => ipcRenderer.send('close-login'),
  isElectron: true,
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
