const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendKeyPress: (key) => ipcRenderer.send('perform-keypress', key),
  // Můžete přidat další funkce, které chcete vystavit frontendové aplikaci
});
