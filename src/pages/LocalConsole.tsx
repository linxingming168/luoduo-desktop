import { useState, useEffect } from 'react';
import { api, getServerUrl } from '../api/client';
import { Monitor, Send, ShieldCheck, ShieldAlert, Terminal, AlertTriangle, CheckCircle, Play } from 'lucide-react';

declare global {
  interface Window { electronAPI?: any; }
}

export default function LocalConsole() {
  const [systemInfo, setSystemInfo] = useState<{ platform?: string; osInfo?: string }>({});
  const [goal, setGoal] = useState('');
  const [command, setCommand] = useState('');
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; stdout?: string; stderr?: string; error?: string } | null>(null);
  const [history, setHistory] = useState<{ goal: string; cmd: string; ok: boolean; output: string }[]>([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSystemInfo().then((info: any) => {
        if (info.ok) setSystemInfo({ platform: info.platform, osInfo: info.osInfo });
      }).catch(() => {});
    }
  }, []);

  const isElectron = !!window.electronAPI;

  const handleGenerate = async () => {
    if (!goal.trim()) return;
    setLoading(true); setApproved(false); setCommand(''); setResult(null);
    try {
      const prompt = `你是一个Windows/PowerShell脚本专家。用户想完成这个目标：${goal}。
请只输出一条可在Windows命令行或PowerShell中执行的命令（安全、可逆、非破坏性）。
要求：不要用rm -rf/del /f/rd /s等高危命令。只输出命令本身，不要解释。`;
      const res = await fetch(`${getServerUrl()}/api/agent/CodeAgent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: prompt }),
      });
      const data = await res.json();
      const cmd = (data.reply || data.code || '').trim().replace(/^```(?:powershell|cmd|bash)?\n?/i, '').replace(/\n?```$/i, '').trim();
      setCommand(cmd);
    } catch (err: any) {
      setCommand(`# 生成失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!command || !window.electronAPI) return;
    setExecuting(true); setResult(null);
    try {
      const r = await window.electronAPI.executeCommand(command);
      setResult(r);
      if (r.ok) {
        setHistory(prev => [{ goal, cmd: command, ok: true, output: (r.stdout || '').slice(0, 500) }, ...prev]);
      } else {
        setHistory(prev => [{ goal, cmd: command, ok: false, output: (r.error || '').slice(0, 500) }, ...prev]);
      }
    } catch (err: any) {
      setResult({ ok: false, error: err.message });
    } finally {
      setExecuting(false); setApproved(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-cyan-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">本地控制台</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI 军团出指令，您确认后在本机执行
            </p>
          </div>
        </div>
        {systemInfo.platform && (
          <div className="text-xs px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            🖥 {systemInfo.platform} · {systemInfo.osInfo?.slice(0, 50)}
          </div>
        )}
      </div>

      {!isElectron && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          本地控制台需要在桌面客户端（Electron）中运行。请下载桌面端。
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主区域 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 输入目标 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">🎯 告诉我你想做什么</h2>
            <textarea value={goal} onChange={e => setGoal(e.target.value)}
              placeholder='例如："帮我看看 D 盘还剩多少空间" / "帮我整理桌面文件到 folders 文件夹" / "检查哪些程序占内存最多"'
              rows={3} className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm resize-none placeholder-gray-400"
            />
            <button onClick={handleGenerate} disabled={!goal.trim() || loading || !isElectron}
              className="mt-3 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white text-sm flex items-center gap-2 transition-colors">
              {loading ? <span className="w-2 h-2 bg-white rounded-full animate-ping" /> : <Terminal className="w-4 h-4" />}
              AI 生成命令
            </button>
          </div>

          {/* 命令预览 + 确认 */}
          {command && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {approved ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
                  生成命令
                </h2>
                {!approved ? (
                  <button onClick={() => setApproved(true)}
                    className="text-xs px-3 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 transition-colors">
                    我确认要执行
                  </button>
                ) : (
                  <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 已确认</span>
                )}
              </div>
              <pre className="p-3 bg-gray-900 dark:bg-black text-green-400 text-xs rounded-xl overflow-x-auto font-mono whitespace-pre-wrap">
                {command || '(空)'}
              </pre>
              <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                请确认命令安全后再执行。高危命令（rm -rf/format/shutdown）已被拦截。
              </div>
              {approved && (
                <button onClick={handleExecute} disabled={executing}
                  className="mt-3 px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm flex items-center gap-2 transition-colors">
                  {executing ? '执行中...' : <><Play className="w-4 h-4" /> 执行命令</>}
                </button>
              )}
            </div>
          )}

          {/* 执行结果 */}
          {result && (
            <div className={`rounded-xl p-4 border ${result.ok ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                {result.ok ? <><CheckCircle className="w-4 h-4 text-green-500" /> 执行成功</> : <><AlertTriangle className="w-4 h-4 text-red-500" /> 执行异常</>}
              </div>
              {result.stdout && (
                <pre className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded-lg max-h-48 overflow-y-auto font-mono">{result.stdout}</pre>
              )}
              {(result.stderr || result.error) && (
                <pre className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-2 max-h-32 overflow-y-auto font-mono">{result.stderr || result.error}</pre>
              )}
            </div>
          )}

          {/* 历史记录 */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">📜 执行历史</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2 text-xs">
                      {h.ok ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-red-500" />}
                      <span className="text-gray-800 dark:text-gray-200 font-medium">{h.goal}</span>
                    </div>
                    <code className="text-[10px] text-gray-500 dark:text-gray-400 block mt-1 truncate">{h.cmd}</code>
                    {h.output && <pre className="text-[10px] text-gray-500 mt-1 truncate">{h.output}</pre>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧说明 */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" /> 安全机制
            </h2>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">🛡️ 高危命令自动拦截（rm -rf/format/shutdown）</li>
              <li className="flex items-start gap-2">✅ 每条命令需您手动确认后才执行</li>
              <li className="flex items-start gap-2">⏱️ 命令 30 秒超时自动终止</li>
              <li className="flex items-start gap-2">📜 执行历史本地留存，可追溯</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">💡 可以做的事</h2>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
              <li>📂 查看/整理文件</li>
              <li>💾 磁盘空间检查</li>
              <li>⚙️ 查看系统信息</li>
              <li>📦 安装软件（需管理员）</li>
              <li>🔄 批量文件操作</li>
              <li>📊 查看进程/性能</li>
              <li>🌐 网络连接检查</li>
              <li>📝 生成文件/报告</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
