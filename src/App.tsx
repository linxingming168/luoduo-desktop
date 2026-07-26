import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TaskHall from './pages/TaskHall';
import Projects from './pages/Projects';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Skills from './pages/Skills';
import LocalConsole from './pages/LocalConsole';
import RemoteWorker from './pages/RemoteWorker';
import Automation from './pages/Automation';
import Inspiration from './pages/Inspiration';
import Tools from './pages/Tools';
import WorkflowEditor from './pages/WorkflowEditor';
import PluginMarket from './pages/PluginMarket';
import { APIKeysPage, PublishChannelsPage } from './pages/Channels';
import Settings from './pages/Settings';
import { useServerHealth } from './hooks/useServerHealth';
import { Bot, AlertTriangle, Download, Rocket } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [chatAgent, setChatAgent] = useState<string | undefined>();
  const { online, updateAvailable, serverVersion, clientVersion } = useServerHealth();

  // 自动更新状态
  const [updaterState, setUpdaterState] = useState<'idle' | 'checking' | 'downloading' | 'downloaded'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  // 监听 electron-updater 事件
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.onUpdateAvailable((info: any) => {
      console.log('[App] 发现新版本:', info.version);
      setUpdateVersion(info.version);
      setUpdaterState('downloading');
    });

    api.onUpdateDownloadProgress((progress: any) => {
      setDownloadProgress(Math.round(progress.percent));
    });

    api.onUpdateDownloaded(() => {
      console.log('[App] 下载完成');
      setUpdaterState('downloaded');
    });
  }, []);

  const handleChat = (agentId: string) => {
    setChatAgent(agentId);
    setPage('chat');
  };

  return (
    <div className="h-screen flex bg-white">
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        online={online}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* 自动更新提示条 */}
        {(updaterState !== 'idle') && (() => {
          const api = (window as any).electronAPI;
          const isElectron = !!api;
          if (!isElectron) {
            // Web 版：后端版本高于客户端时提示刷新
            if (!updateAvailable) return null;
            return (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#ebebeb] text-sm">
                <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700">
                  检测到新版本 v{serverVersion}（当前 v{clientVersion}），刷新页面即可更新。
                </span>
                <button onClick={() => window.location.reload()}
                  className="ml-2 px-3 py-1 rounded bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors flex-shrink-0">
                  刷新
                </button>
              </div>
            );
          }
          // Electron 版：显示真实下载进度
          return (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#ebebeb] text-sm">
              {updaterState === 'downloading' ? (
                <>
                  <Download className="w-4 h-4 text-gray-500 flex-shrink-0 animate-pulse" />
                  <span className="text-gray-700">
                    正在下载 v{updateVersion || serverVersion}... {downloadProgress}%
                  </span>
                  <div className="flex-1 max-w-[200px] ml-2 bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-900 h-2 rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </>
              ) : updaterState === 'downloaded' ? (
                <>
                  <Rocket className="w-4 h-4 text-gray-700 flex-shrink-0" />
                  <span className="text-gray-700">
                    v{updateVersion || serverVersion} 已就绪，重启后生效
                  </span>
                  <button onClick={() => api.quitAndInstall()}
                    className="ml-2 px-3 py-1 rounded bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors flex-shrink-0">
                    立即重启
                  </button>
                </>
              ) : null}
            </div>
          );
        })()}
        {/* 后端版本提示（仅 Web 版且非更新中） */}
        {updateAvailable && updaterState === 'idle' && !(window as any).electronAPI && (() => {
          return (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#ebebeb] text-sm">
              <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-700">
                检测到新版本 v{serverVersion}（当前 v{clientVersion}），刷新页面即可更新。
              </span>
              <button onClick={() => window.location.reload()}
                className="ml-2 px-3 py-1 rounded bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors flex-shrink-0">
                刷新
              </button>
            </div>
          );
        })()}
        {/* Small header bar on mobile */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-[#ebebeb] bg-white">
          <Bot className="w-4 h-4 text-gray-900" />
          <span className="text-sm font-medium text-gray-900">落朵大脑 · AI军团</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {page === 'dashboard' && <Dashboard onChat={handleChat} />}
          {page === 'taskhall' && <TaskHall />}
          {page === 'projects' && <Projects />}
          {page === 'chat' && <Chat initialAgent={chatAgent} />}
          {page === 'automation' && <Automation />}
          {page === 'inspiration' && <Inspiration />}
          {page === 'tools' && <Tools />}
          {page === 'workflow' && <WorkflowEditor />}
          {page === 'plugins' && <PluginMarket />}
          {page === 'apikeys' && <APIKeysPage />}
          {page === 'channels' && <PublishChannelsPage />}
          {page === 'knowledge' && <Knowledge />}
          {page === 'skills' && <Skills />}
          {page === 'local' && <LocalConsole />}
          {page === 'remote' && <RemoteWorker />}
          {page === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}
