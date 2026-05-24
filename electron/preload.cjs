const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  switchToMain: () => ipcRenderer.send('switch-to-main'),
  closeLogin: () => ipcRenderer.send('close-login'),
  isElectron: true,
});
