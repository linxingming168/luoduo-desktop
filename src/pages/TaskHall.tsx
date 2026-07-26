import { useState, useEffect } from 'react';
import { api, createClient } from '../api/client';
import type { Agent } from '../api/types';
import { Send, Bot, CheckCircle, AlertCircle, Users, Target, Lock, Unlock, UserCheck } from 'lucide-react';

const AGENTS_SEL_KEY = 'luoduo_enabled_agents';
const AGENTS_LOCK_KEY = 'luoduo_enabled_agents_locked';

interface DispatchAgent {
  id: string;
  label: string;
  emoji?: string;
}

function loadEnabled(): Set<string> {
  try {
    const arr = JSON.parse(localStorage.getItem(AGENTS_SEL_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : []);
  } catch { return new Set(); }
}
function saveEnabled(s: Set<string>) {
  localStorage.setItem(AGENTS_SEL_KEY, JSON.stringify(Array.from(s)));
}

export default function TaskHall() {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [manualReply, setManualReply] = useState('');

  // 派发智能体勾选
  const [dispatchAgents, setDispatchAgents] = useState<DispatchAgent[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(loadEnabled);
  const [locked, setLocked] = useState(() => localStorage.getItem(AGENTS_LOCK_KEY) === '1');

  useEffect(() => {
    api.getAgents().then(r => setAgents(r.agents || [])).catch(() => {});
    // 加载派发智能体列表
    createClient().get('/api/agents/dispatch-list').then(({ data }: any) => {
      const list: DispatchAgent[] = data?.agents || [];
      setDispatchAgents(list);
      // 若尚未保存过，默认全部启用
      if (localStorage.getItem(AGENTS_SEL_KEY) === null) {
        setEnabled(new Set(list.map(a => a.id)));
        localStorage.setItem(AGENTS_SEL_KEY, JSON.stringify(list.map(a => a.id)));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { saveEnabled(enabled); }, [enabled]);
  useEffect(() => { localStorage.setItem(AGENTS_LOCK_KEY, locked ? '1' : '0'); }, [locked]);

  const toggleAgent = (id: string) => {
    if (locked) return;
    setEnabled(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleAutoDispatch = async () => {
    if (!task.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const body: any = { instruction: task.trim() };
      // 如果有保存的 enabled_agents 且不是全部启用，才传
      if (enabled.size > 0 && enabled.size < dispatchAgents.length) {
        body.enabled_agents = Array.from(enabled);
      }
      const res = await fetch(`https://tyb.ap100168.com/api/skydo/run_mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualChat = async () => {
    if (!selectedAgent || !manualInput.trim()) return;
    try {
      const data = await api.executeAgent(selectedAgent, { instruction: manualInput.trim() });
      setManualReply(data.reply || data.error || '(空响应)');
    } catch (err: any) {
      setManualReply(`请求失败: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">任务大厅</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            发布任务 → AI 军团自动认领协同，或手动挑选智能体
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：任务发布区 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 自动分派 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🤖 智能分派</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              描述您要完成的任务，AI 军团自动规划、分派、执行
            </p>
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder='例如："我想做大亚湾新零售市场调研和成本预算"'
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
            />
            <button
              onClick={handleAutoDispatch}
              disabled={!task.trim() || loading}
              className="mt-3 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-900 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm transition-colors flex items-center gap-2"
            >
              {loading ? (
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : <Send className="w-4 h-4" />}
              {loading ? 'AI 军团执行中...' : '发布任务 · 智能分派'}
            </button>
          </div>

          {/* 活跃智能体筛选 */}
          {dispatchAgents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">活跃智能体</h2>
                <span className="text-xs text-gray-400 ml-1">{enabled.size}/{dispatchAgents.length}</span>
                <button
                  onClick={() => setLocked(v => !v)}
                  className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${
                    locked ? 'border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {locked ? '已锁定' : '未锁定'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-2">勾选的智能体才参与分派，省去不相关的技能阅读与算力</p>
              {enabled.size > 0 && enabled.size < dispatchAgents.length && (
                <p className="text-xs text-gray-500 mb-2">⚠️ 已启用 {enabled.size}/{dispatchAgents.length} 个智能体，未启用的不参与本次派发</p>
              )}
              <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {dispatchAgents.map(a => {
                  const on = enabled.has(a.id);
                  return (
                    <label key={a.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                      locked ? 'opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${on ? 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      <input type="checkbox" checked={on} disabled={locked} onChange={() => toggleAgent(a.id)} className="w-3 h-3 accent-gray-500" />
                      <span className="truncate">{a.label || a.id}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 执行结果 */}
          {result && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-500" />
                执行结果
              </h2>
              {result.error ? (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {result.error}
                </div>
              ) : (
                <div className="space-y-3">
                  {result.steps && result.steps.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        分派方案 · {result.steps.length} 个智能体
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.steps.map((s: any, i: number) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                            {s.agent || s.general || '?'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.results_summary && result.results_summary.map((r: any, i: number) => (
                    <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {r.agent}
                        </span>
                        {r.ok ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 完成</span>
                        ) : (
                          <span className="text-xs text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 异常</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 markdown-body whitespace-pre-wrap line-clamp-4">
                        {(r.reply || r.artifact || r.code || r.error || '').slice(0, 300)}
                      </div>
                    </div>
                  ))}
                  {result.reply && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 markdown-body">
                      <div className="text-xs font-semibold text-gray-500 mb-1">📋 诸葛亮汇总</div>
                      {result.reply.slice(0, 600)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：手动挑选智能体 */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">👤 手动选人</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              从智能体中选一个，单独指派任务
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-3 border border-gray-100 dark:border-gray-700 rounded-lg p-1">
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgent(a.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedAgent === a.id
                      ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-lg leading-none flex-shrink-0">{a.emoji || '🤖'}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{a.label || a.id}</span>
                    <span className="block text-[10px] text-gray-400 truncate">{a.role || '智能体'}</span>
                  </span>
                </button>
              ))}
            </div>
            {selectedAgent && (
              <>
                <textarea
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  placeholder={`向 ${agents.find(a => a.id === selectedAgent)?.label || selectedAgent} 提问...`}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                />
                <button
                  onClick={handleManualChat}
                  disabled={!manualInput.trim()}
                  className="mt-2 w-full px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-900 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm transition-colors"
                >
                  指派任务
                </button>
              </>
            )}
            {manualReply && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 markdown-body">
                {manualReply.slice(0, 400)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
