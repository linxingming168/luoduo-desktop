import { useState, useRef, useEffect } from 'react';
import { api, decorateAgent } from '../api/client';
import type { Agent } from '../api/types';
import ChatBubble from '../components/ChatBubble';
import { Send, Bot, Plus, Search, MessageSquarePlus, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
}

interface Conversation {
  id: string;
  agentId: string;
  messages: Message[];
  createdAt: number;
}

const CONV_KEY = 'luoduo_conversations';

function loadConvs(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(CONV_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveConvs(list: Conversation[]) {
  localStorage.setItem(CONV_KEY, JSON.stringify(list));
}

function uid(): string {
  return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function Chat({ initialAgent }: { initialAgent?: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [convs, setConvs] = useState<Conversation[]>(() => loadConvs());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 用函数式更新，避免异步期间拿到过期快照
  const updateConv = (id: string, updater: (c: Conversation) => Conversation) => {
    setConvs(prev => {
      const next = prev.map(c => (c.id === id ? updater(c) : c));
      saveConvs(next);
      return next;
    });
  };

  useEffect(() => {
    api.getAgents().then(res => {
      const list = res.agents || [];
      setAgents(list);
      // 首次进入且没有任何会话 -> 自动建一个默认（诸葛亮）会话
      setConvs(prev => {
        if (prev.length) return prev;
        if (list.length) {
          const c: Conversation = { id: uid(), agentId: list[0].id, messages: [], createdAt: Date.now() };
          saveConvs([c]);
          setActiveId(c.id);
          return [c];
        }
        return prev;
      });
    }).catch(() => {});
  }, []);

  // 外部传入 agent（如「智能体面板」点开）
  useEffect(() => {
    if (!initialAgent) return;
    setConvs(prev => {
      const existing = prev.find(c => c.agentId === initialAgent);
      if (existing) {
        setActiveId(existing.id);
        return prev;
      }
      const c: Conversation = { id: uid(), agentId: initialAgent, messages: [], createdAt: Date.now() };
      const next = [c, ...prev];
      saveConvs(next);
      setActiveId(c.id);
      return next;
    });
  }, [initialAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convs, activeId, loading]);

  const active = convs.find(c => c.id === activeId) || null;
  const activeAgent =
    agents.find(a => a.id === active?.agentId) ||
    (active ? decorateAgent(active.agentId) : null);

  const newConversation = (agentId: string) => {
    const c: Conversation = { id: uid(), agentId, messages: [], createdAt: Date.now() };
    setConvs(prev => {
      const next = [c, ...prev];
      saveConvs(next);
      return next;
    });
    setActiveId(c.id);
    setShowPicker(false);
    setSearch('');
  };

  const handleSend = async () => {
    if (!input.trim() || !active || loading) return;
    const text = input.trim();
    const userMsg: Message = { role: 'user', content: text };
    updateConv(active.id, c => ({ ...c, messages: [...c.messages, userMsg] }));
    setInput('');
    setLoading(true);
    try {
      const res = await api.executeAgent(active.agentId, { instruction: text });
      const reply = res.reply || res.error || '(空响应)';
      const assistantMsg: Message = {
        role: 'assistant',
        content: reply,
        agentId: active.agentId,
      };
      updateConv(active.id, c => ({ ...c, messages: [...c.messages, assistantMsg] }));
    } catch (err: any) {
      const errMsg: Message = {
        role: 'assistant',
        content: `请求失败: ${err?.message || err}`,
        agentId: active.agentId,
      };
      updateConv(active.id, c => ({ ...c, messages: [...c.messages, errMsg] }));
    } finally {
      setLoading(false);
    }
  };

  const filtered = agents.filter(a =>
    !search.trim() ||
    a.label.includes(search.trim()) ||
    a.role?.includes(search.trim()) ||
    a.id.toLowerCase().includes(search.trim().toLowerCase())
  );

  const lastPreview = (c: Conversation) =>
    c.messages[c.messages.length - 1]?.content || '（空会话）';

  return (
    <div className="flex h-full">
      {/* 左侧：会话列表 */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convs.length === 0 && (
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-10 px-4">
              还没有对话，点击上方「新建对话」选择一个智能体开始。
            </div>
          )}
          {convs.map(c => {
            const ag = agents.find(a => a.id === c.agentId) || decorateAgent(c.agentId);
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{ag.emoji}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {ag.label}
                  </span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 pl-6">
                  {lastPreview(c)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧：聊天区 */}
      <div className="flex-1 flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">点击「新建对话」选择一个智能体开始</p>
            </div>
          </div>
        ) : (
          <>
            {/* 头部：当前智能体 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <span className="text-2xl leading-none">{activeAgent?.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {activeAgent?.label}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {activeAgent?.role}
                </div>
              </div>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                在线
              </span>
            </div>

            {/* 消息 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {active.messages.length === 0 && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <Bot className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">开始与 {activeAgent?.label} 对话</p>
                </div>
              )}
              {active.messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} agentName={msg.agentId} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`向 ${activeAgent?.label} 提问...`}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Agent 选择面板 */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl w-[680px] max-w-[92vw] max-h-[82vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">选择一个智能体</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  落朵 AI 军团 · 共 {agents.length} 位
                </p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索智能体名称 / 角色 / id"
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(a => (
                <button
                  key={a.id}
                  onClick={() => newConversation(a.id)}
                  className="text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl leading-none">{a.emoji}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {a.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.role}</div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">
                    {a.id}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-400 py-10">
                  没有匹配的智能体
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
