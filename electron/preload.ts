import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  executeCommand: (command: string) => ipcRenderer.invoke('execute-command', command),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  remoteWorkerStart: () => ipcRenderer.invoke('remote-worker-start'),
  remoteWorkerStop: () => ipcRenderer.invoke('remote-worker-stop'),
  remoteWorkerStatus: () => ipcRenderer.invoke('remote-worker-status'),
  onRemoteTaskDone: (callback: (data: any) => void) => {
    ipcRenderer.on('remote-task-done', (_event, data) => callback(data));
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateUrl: () => ipcRenderer.invoke('get-update-url'),
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },
});
