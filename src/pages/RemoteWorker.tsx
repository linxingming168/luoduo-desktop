import { useState, useEffect } from 'react';
import { getServerUrl } from '../api/client';
import { Radio, Wifi, WifiOff, CheckCircle, AlertTriangle, Power, PowerOff, List } from 'lucide-react';

declare global { interface Window { electronAPI?: any } }

interface TaskRecord {
  task_id: string; instruction: string; ok?: boolean;
  stdout?: string; stderr?: string; completed_at?: string;
}

export default function RemoteWorkerPage() {
  const [active, setActive] = useState(false);
  const [history, setHistory] = useState<TaskRecord[]>([]);
  const [tasks, setTasks] = useState({ pending: 0, completed: 0 });

  const isElectron = !!window.electronAPI;

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.remoteWorkerStatus().then((s: any) => setActive(s.active));
    window.electronAPI.onRemoteTaskDone((data: any) => {
      setHistory(prev => [{
        task_id: data.task_id, instruction: '',
        ok: data.result?.ok, stdout: data.result?.stdout, stderr: data.result?.stderr,
        completed_at: new Date().toLocaleString(),
      }, ...prev]);
      refreshTasks();
    });
    refreshTasks();
    const timer = setInterval(refreshTasks, 10000);
    return () => clearInterval(timer);
  }, []);

  const refreshTasks = async () => {
    try {
      const r = await fetch(`${getServerUrl()}/api/remote/tasks`);
      const d = await r.json();
      if (d) setTasks({ pending: d.pending || 0, completed: d.completed || 0 });
    } catch {}
  };

  const toggleWorker = async () => {
    if (!window.electronAPI) return;
    if (active) {
      const r = await window.electronAPI.remoteWorkerStop();
      if (r.ok) setActive(false);
    } else {
      const r = await window.electronAPI.remoteWorkerStart();
      if (r.ok) setActive(true);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Radio className="w-6 h-6 text-green-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">远程助手</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">在外地远程操控办公室电脑</p>
          </div>
        </div>
      </div>

      {!isElectron && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          远程助手需要在桌面客户端（Electron）中运行。请下载桌面端。
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 开关 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🔄 Worker 状态</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full ${active ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
              {active ? '运行中' : '已停止'}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            {active ? <Wifi className="w-8 h-8 text-green-500" /> : <WifiOff className="w-8 h-8 text-gray-400" />}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {active
                ? '后台每 5 秒轮询一次任务队列，自动领取执行'
                : '启动后，AI 军团可以远程操控这台电脑'}
            </div>
          </div>
          <button onClick={toggleWorker} disabled={!isElectron}
            className={`w-full py-3 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              active
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300'
            }`}>
            {active ? <><PowerOff className="w-4 h-4" /> 停止远程Worker</> : <><Power className="w-4 h-4" /> 启动远程Worker</>}
          </button>
        </div>

        {/* 队列状态 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">📊 任务队列</h2>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500">{tasks.pending}</div>
              <div className="text-xs text-gray-500 mt-1">待处理</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{tasks.completed}</div>
              <div className="text-xs text-gray-500 mt-1">已完成</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            💡 在微信/对话中给穿山甲发指令 → AI军团生成命令 → 这台电脑自动执行
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <List className="w-4 h-4 text-blue-500" /> 使用流程
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {[
            ['📱', '您在外地发指令', '微信/这里说 "帮我处理合同"'],
            ['🧠', 'AI军团生成方案', '诸葛亮分派 → CodeAgent出命令'],
            ['🔄', '桌面端自动领取', 'Worker 5秒轮询 → 本机执行'],
            ['✅', '结果沿路返回', '执行完 → 通知您结果'],
          ].map(([icon, step, desc], i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="font-medium text-gray-800 dark:text-gray-200 text-xs">{step}</div>
              <div className="text-[10px] text-gray-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 执行历史 */}
      {history.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">📜 执行记录</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  {h.ok ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-red-500" />}
                  <span className="text-gray-500">{h.completed_at}</span>
                </div>
                {h.stdout && <pre className="mt-1 text-gray-600 dark:text-gray-400 truncate">{h.stdout.slice(0, 200)}</pre>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
