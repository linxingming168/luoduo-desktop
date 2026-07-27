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
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  // 对话本地持久化（跨更新长记忆）
  loadConversations: () => ipcRenderer.invoke('conversations-load'),
  saveConversations: (data: any) => ipcRenderer.invoke('conversations-save', data),
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },
});
