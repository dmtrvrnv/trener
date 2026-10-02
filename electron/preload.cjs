const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('trener', {
  platform: process.platform,
  openMain: route => ipcRenderer.invoke('trener:open-main', route),
  hideWidget: () => ipcRenderer.invoke('trener:hide-widget'),
});
ipcRenderer.on('trener:navigate', (_event, route) => { if (typeof route === 'string' && route.startsWith('/')) window.location.hash = route; });
