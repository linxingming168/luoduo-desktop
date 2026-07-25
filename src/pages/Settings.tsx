import { useState, useEffect } from 'react';
import { getServerUrl, setServerUrl, getApiKey, setApiKey } from '../api/client';
import { Settings as SettingsIcon, Globe, Moon, Sun, Info, Save, KeyRound, AlertTriangle } from 'lucide-react';
import { useServerHealth } from '../hooks/useServerHealth';

export default function Settings() {
  const [serverUrl, setLocalUrl] = useState(getServerUrl());
  const [apiKey, setLocalKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  const [appVersion, setAppVersion] = useState('...');
  const { online, updateAvailable, serverVersion, clientVersion } = useServerHealth();
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  // 从 Electron 主进程读取版本号
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.getAppVersion) {
      api.getAppVersion().then((v: string) => setAppVersion(v)).catch(() => setAppVersion(clientVersion));
    } else {
      setAppVersion(clientVersion);
    }
  }, [clientVersion]);

  const handleSave = () => {
    setServerUrl(serverUrl);
    setApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">设置</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">配置桌面客户端</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Server URL */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">服务器地址</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            连接 AI 军团大脑（8008端口）的地址。修改后需重新连接。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrl}
              onChange={e => setLocalUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? '已保存' : '保存'}
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">API Key（发消息鉴权）</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            落朵大脑接口需要密钥才能执行智能体。填入后随请求以 <code className="px-1 rounded bg-gray-100 dark:bg-gray-700">?api_key=</code> 传递。智能体列表无需密钥即可加载。
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => setLocalKey(e.target.value)}
              placeholder="粘贴你的 API Key"
              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? '已保存' : '保存'}
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            {darkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            外观
          </h2>
          <button
            onClick={toggleDark}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? '切换到亮色模式' : '切换到暗色模式'}
          </button>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">关于</h2>
          </div>
          <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
            <p><span className="text-gray-700 dark:text-gray-300">应用：</span>落朵大脑 · AI军团</p>
            <p><span className="text-gray-700 dark:text-gray-300">版本：</span>{appVersion}</p>
            {updateAvailable && (
              <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 pt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                后端新版本 v{serverVersion} 可用，请升级客户端
              </p>
            )}
            <p><span className="text-gray-700 dark:text-gray-300">公司：</span>惠州市兴华科技有限公司</p>
            <p className="pt-2 text-xs text-gray-400 dark:text-gray-500">
              基于 Electron + React 构建。连接到 AI 军团大脑服务器使用。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
