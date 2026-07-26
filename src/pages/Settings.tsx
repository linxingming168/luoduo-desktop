import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Globe, Info, Save, KeyRound, AlertTriangle, RefreshCw } from 'lucide-react';
import { getServerUrl, setServerUrl, getApiKey, setApiKey } from '../api/client';
import { useServerHealth } from '../hooks/useServerHealth';

export default function Settings() {
  const [serverUrl, setLocalUrl] = useState(getServerUrl());
  const [apiKey, setLocalKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  const [appVersion, setAppVersion] = useState('...');
  const { online, updateAvailable, serverVersion, clientVersion } = useServerHealth();
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState('');
  const [audiolibKey, setAudiolibKey] = useState(localStorage.getItem('luoduo_audiolib_key') || '');

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
    localStorage.setItem('luoduo_audiolib_key', audiolibKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCheckUpdate = async () => {
    setUpdateChecking(true);
    setUpdateResult('');
    const api = (window as any).electronAPI;
    if (!api?.checkForUpdates) {
      setUpdateResult('Web 版不支持检查更新（请在桌面客户端使用）');
      setUpdateChecking(false);
      return;
    }
    try {
      const result = await api.checkForUpdates();
      if (result.ok && result.version) {
        if (result.version !== appVersion) {
          setUpdateResult(`发现新版本 v${result.version}，正在后台自动下载…`);
        } else {
          setUpdateResult(`当前已是最新版本 v${appVersion}`);
        }
      } else {
        setUpdateResult('当前已是最新版本');
      }
    } catch (e: any) {
      setUpdateResult('检查更新失败：' + (e.message || '未知错误'));
    } finally {
      setUpdateChecking(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">设置</h1>
          <p className="text-sm text-gray-500">配置桌面客户端</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Server URL */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">服务器地址</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            连接 AI 军团大脑（8008端口）的地址。修改后需重新连接。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrl}
              onChange={e => setLocalUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? '已保存' : '保存'}
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">API Key（发消息鉴权）</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            落朵大脑接口需要密钥才能执行智能体。填入后随请求以 <code className="px-1 rounded bg-gray-100">?api_key=</code> 传递。智能体列表无需密钥即可加载。
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => setLocalKey(e.target.value)}
              placeholder="粘贴你的 API Key"
              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
            <Save className="w-3.5 h-3.5" />
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>

      {/* Open Music: AudioLib Key（开放/合规原创音源） */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">开放音乐 Key（AudioLib）</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          接入 AudioLib 开放原创音乐（10万+ 首、零版权风险、可商用）。到 <a href="https://audiolib.ai" target="_blank" rel="noreferrer" className="text-gray-700 underline">audiolib.ai</a> 注册免费获取 API Key，填入后对话中点「🎧 开放音乐」即可听。仅接合规授权音源。
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={audiolibKey}
            onChange={e => setAudiolibKey(e.target.value)}
            placeholder="粘贴 AudioLib API Key（alp_ 开头）"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>

      {/* About */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">关于</h2>
          </div>
          <div className="space-y-1 text-sm text-gray-500">
            <p><span className="text-gray-700">应用：</span>落朵大脑 · AI军团</p>
            <p><span className="text-gray-700">版本：</span>{appVersion}</p>
            {updateAvailable && (
              <p className="flex items-center gap-1.5 text-gray-700 pt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                后端新版本 v{serverVersion} 可用，请升级客户端
              </p>
            )}
            <p><span className="text-gray-700">公司：</span>惠州市兴华科技有限公司</p>
            <p className="pt-2 text-xs text-gray-400">
              基于 Electron + React 构建。连接到 AI 军团大脑服务器使用。
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button onClick={handleCheckUpdate} disabled={updateChecking}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${updateChecking ? 'animate-spin' : ''}`} />
              {updateChecking ? '检查中…' : '检查更新'}
            </button>
            {updateResult && (
              <p className="mt-2 text-xs text-gray-500">{updateResult}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
