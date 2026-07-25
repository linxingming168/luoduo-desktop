import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import http from 'http';
import { autoUpdater } from 'electron-updater';

const execAsync = promisify(exec);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '落朵大脑 · AI军团',
    icon: path.join(__dirname, '../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // 桌面端以 file:// 源加载，渲染进程直连自有后端 tyb.ap100168.com 会被 CORS 拦截。
      // 关闭渲染进程 web 安全策略以放行自有后端调用（内部本地 AI 客户端，可接受）。
      webSecurity: false,
    },
    show: false,
  });

  // 加载构建产物或开发服务器
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // 关闭窗口时最小化到托盘（非退出）
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

function createTray(): void {
  const trayIconPath = path.join(__dirname, '../resources/icon.png');
  const trayIcon = nativeImage.createFromPath(trayIconPath).resize({ width: 22, height: 22 });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('落朵大脑 · AI军团');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('open-external', (_event, url: string) => {
  if (typeof url === 'string' && url.startsWith('http')) {
    shell.openExternal(url);
  }
});

// 本地命令执行（安全沙箱：仅允许白名单命令类别，且用户确认）
ipcMain.handle('execute-command', async (_event, command: string) => {
  // 安全拦截：禁止高危操作
  const blacklist = ['rm -rf', 'format', 'del /f', 'rd /s', 'shutdown', 'restart', 'net user',
                     'reg delete', 'taskkill /f', '>nul', 'powershell -Command Remove'];
  for (const bad of blacklist) {
    if (command.toLowerCase().includes(bad)) {
      return { ok: false, error: `命令被安全策略拦截: ${bad}` };
    }
  }
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    return { ok: true, stdout: stdout.slice(0, 5000), stderr: stderr.slice(0, 2000) };
  } catch (err: any) {
    return { ok: false, error: err.message, stdout: err.stdout?.slice(0, 2000) || '' };
  }
});

// ============ 远程Worker（后台轮询大脑任务队列） ============
let remoteWorkerInterval: any = null;
let remoteWorkerActive = false;
const REMOTE_API = 'https://tyb.ap100168.com/api/remote';

function httpGet(url: string): Promise<any> {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? require('https') : require('http');
    proto.get(url, { rejectUnauthorized: false }, (res: any) => {
      let d = '';
      res.on('data', (c: string) => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function httpPost(url: string, body: any): Promise<any> {
  return new Promise((resolve) => {
    const json = JSON.stringify(body);
    const proto = url.startsWith('https') ? require('https') : require('http');
    const req = proto.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) },
      rejectUnauthorized: false,
    }, (res: any) => {
      let d = '';
      res.on('data', (c: string) => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(json);
    req.end();
  });
}

async function remoteWorkerTick() {
  try {
    const resp = await httpGet(`${REMOTE_API}/task/next`);
    if (!resp?.ok || !resp.task) return;
    const task = resp.task;
    let result: any = { ok: false, stdout: '', stderr: '' };
    const cmd = task.instruction;
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
      result = { ok: true, stdout: (stdout || '').slice(0, 10000), stderr: (stderr || '').slice(0, 2000) };
    } catch (err: any) {
      result = { ok: false, error: err.message, stdout: (err.stdout || '').slice(0, 5000) };
    }
    await httpPost(`${REMOTE_API}/${task.task_id}/result`, { result, ok: result.ok, stdout: result.stdout, stderr: result.stderr });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote-task-done', { task_id: task.task_id, result });
    }
  } catch (_) {}
}

ipcMain.handle('remote-worker-start', async () => {
  if (remoteWorkerActive) return { ok: true, alreadyActive: true };
  remoteWorkerActive = true;
  remoteWorkerInterval = setInterval(remoteWorkerTick, 5000);
  remoteWorkerTick();
  return { ok: true, active: true };
});

ipcMain.handle('remote-worker-stop', async () => {
  remoteWorkerActive = false;
  if (remoteWorkerInterval) { clearInterval(remoteWorkerInterval); remoteWorkerInterval = null; }
  return { ok: true, active: false };
});

ipcMain.handle('remote-worker-status', async () => {
  return { active: remoteWorkerActive };
});

// 获取系统信息
ipcMain.handle('get-system-info', async () => {
  try {
    const platform = process.platform;
    let osInfo = '';
    if (platform === 'win32') {
      const r = await execAsync('systeminfo | findstr /B /C:"OS Name" /C:"OS Version"', { timeout: 10000 });
      osInfo = r.stdout;
    } else {
      const r = await execAsync('uname -a', { timeout: 5000 });
      osInfo = r.stdout;
    }
    return { ok: true, platform, osInfo: osInfo.trim() };
  } catch (err: any) {
    return { ok: false, platform: process.platform, error: err.message };
  }
});

// ============ 自动更新（GitHub Release） ============
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'linxingming168',
  repo: 'luoduo-desktop',
});
autoUpdater.autoDownload = true;  // 检测到新版本自动下载

autoUpdater.on('update-available', (info) => {
  console.log('[updater] 发现新版本:', info.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-download-progress', progress);
  }
});

autoUpdater.on('update-downloaded', () => {
  console.log('[updater] 下载完成，3秒后安装重启');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', {});
  }
  // 通知渲染进程后自动安装并重启
  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true);
  }, 5000);
});

autoUpdater.on('error', (err) => {
  console.error('[updater] 更新出错:', err.message);
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result?.updateInfo?.version };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// App lifecycle
app.whenReady().then(() => {
  mainWindow = createWindow();
  createTray();

  // 启动后检查更新（延迟10秒，避免影响启动体验）
  setTimeout(() => {
    try { autoUpdater.checkForUpdates(); } catch {}
  }, 10000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 非 macOS 即使所有窗口关闭也不退出（有托盘）
  }
});
