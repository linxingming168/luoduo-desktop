import { useState, useRef, useEffect } from 'react';
import { api, decorateAgent } from '../api/client';
import type { Agent } from '../api/types';
import ChatBubble from '../components/ChatBubble';
import { Send, Bot, Plus, Search, MessageSquarePlus, X, Paperclip, FolderOpen, Square, Mic, Navigation, BrainCircuit, Download, Eye, FileText } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  artifact?: string;
  downloadUrl?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [routeMode, setRouteMode] = useState<'auto' | 'manual'>('manual');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [chatMode, setChatMode] = useState<'chat' | 'task'>(() => {
    const saved = localStorage.getItem('luoduo_chat_mode') as 'chat'|'task'|null;
    return saved || 'chat';
  });
  const [streamingText, setStreamingText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState('');

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
    // 从 localStorage 直接读取模式，避免 React state 闭包不同步
    const currentMode = (localStorage.getItem('luoduo_chat_mode') as 'chat'|'task') || 'chat';
    const userMsg: Message = { role: 'user', content: text };
    updateConv(active.id, c => ({ ...c, messages: [...c.messages, userMsg] }));
    setInput('');
    setLoading(true);

    if (currentMode === 'chat') {
      // SSE 流式模式
      setStreamingText('');
      try {
        const response = await fetch(`https://tyb.ap100168.com/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: active.id,
            message: text,
            mode: 'chat',
          }),
        });
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: token')) continue;
            if (line.startsWith('event: done')) {
              const assistantMsg: Message = { role: 'assistant', content: fullReply, agentId: active.agentId };
              updateConv(active.id, c => ({ ...c, messages: [...c.messages, assistantMsg] }));
              setStreamingText('');
              break;
            }
            if (line.startsWith('event: error')) continue;
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.content) {
                  fullReply += d.content;
                  setStreamingText(fullReply);
                }
              } catch {}
            }
          }
        }
      } catch (err: any) {
        const errMsg: Message = { role: 'assistant', content: `请求失败: ${err?.message || err}`, agentId: active.agentId };
        updateConv(active.id, c => ({ ...c, messages: [...c.messages, errMsg] }));
      } finally {
        setLoading(false);
        setStreamingText('');
      }
    } else {
      // 任务模式（原有 executeAgent）
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await api.executeAgent(active.agentId, { instruction: text }, ctrl.signal);
        const reply = res.reply || res.error || '(空响应)';
        const artifact = res.artifact || '';
        const downloadUrl = res.download_url || '';
        const assistantMsg: Message = {
          role: 'assistant',
          content: reply,
          agentId: active.agentId,
          artifact,
          downloadUrl,
        };
        updateConv(active.id, c => ({ ...c, messages: [...c.messages, assistantMsg] }));
        // 自动打开 HTML 预览
        if (downloadUrl && (downloadUrl.endsWith('.html') || downloadUrl.endsWith('.htm'))) {
          setPreviewUrl(downloadUrl);
          setPreviewLabel(artifact || '预览');
        }
      } catch (err: any) {
        if (err?.name === 'CanceledError' || ctrl.signal.aborted) {
          updateConv(active.id, c => ({ ...c, messages: [...c.messages, { role: 'assistant', content: '⏹ 已停止', agentId: active.agentId }] }));
        } else {
          updateConv(active.id, c => ({ ...c, messages: [...c.messages, { role: 'assistant', content: `请求失败: ${err?.message || err}`, agentId: active.agentId }] }));
        }
      } finally {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const switchChatMode = (mode: 'chat' | 'task') => {
    localStorage.setItem('luoduo_chat_mode', mode);
    setChatMode(mode);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    const text = await file.text();
    const preview = text.length > 2000 ? text.slice(0, 2000) + '\n...（截断，共' + text.length + '字）' : text;
    setInput(prev => (prev ? prev + '\n' : '') + `[文件: ${file.name}]\n${preview}`);
    e.target.value = '';
  };

  const handleDirUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !active) return;
    const names: string[] = [];
    for (const f of files) names.push(f.name);
    setInput(prev => (prev ? prev + '\n' : '') + `[文件夹: ${files.length} 个文件]\n${names.join(', ')}`);
    e.target.value = '';
  };

  const handleDirButtonClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    input.onchange = async (e: any) => {
      const files = e.target?.files;
      if (!files || !files.length) return;
      const names: string[] = [];
      for (const f of files) names.push(f.name);
      setInput(prev => (prev ? prev + '\n' : '') + `[文件夹: ${files.length} 个文件]\n${names.join(', ')}`);
    };
    input.click();
  };

  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setInput(prev => prev + '[语音]'); return; }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = 'zh-CN';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((res: any) => res[0].transcript).join('');
      setInput(prev => { const p = prev.endsWith('[🎤...]') ? prev.replace('[🎤...]','').trim() : prev; return p ? p + t : t; });
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
    setInput(prev => prev + '[🎤...]');
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
      <div className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">点击「新建对话」选择一个智能体开始</p>
            </div>
          </div>
        ) : (
          <>
            {/* 头部：当前智能体 + 模式切换 */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <span className="text-2xl leading-none">{activeAgent?.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {activeAgent?.label}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {activeAgent?.role}
                </div>
              </div>
              {/* 模式切换按钮 */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
                <button
                  onClick={() => switchChatMode('chat')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    chatMode === 'chat'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  💬 自由对话
                </button>
                <button
                  onClick={() => switchChatMode('task')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    chatMode === 'task'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  📋 任务工作台
                </button>
              </div>
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
                <div key={i}>
                  <ChatBubble role={msg.role} content={msg.content} agentName={msg.agentId} />
                  {msg.artifact && msg.downloadUrl && (
                    <div className="ml-12 mt-1 mb-2">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[160px]">
                          {msg.artifact}
                        </span>
                        {msg.artifact.endsWith('.html') || msg.artifact.endsWith('.htm') ? (
                          <button
                            onClick={() => { setPreviewUrl(msg.downloadUrl!); setPreviewLabel(msg.artifact!); }}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" /> 预览
                          </button>
                        ) : null}
                        <a href={msg.downloadUrl} download
                          className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-700 font-medium">
                          <Download className="w-3.5 h-3.5" /> 下载
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* SSE 流式打字机渲染 */}
              {loading && streamingText && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-gray-800 dark:text-gray-200 markdown-body whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                  </div>
                </div>
              )}
              {loading && !streamingText && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* 右侧：产物预览面板 */}
      {previewUrl && (
        <div className="w-[480px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{previewLabel || '预览'}</span>
            <button onClick={() => { setPreviewUrl(null); setPreviewLabel(''); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            {previewUrl.endsWith('.html') || previewUrl.endsWith('.htm') ? (
              <iframe src={previewUrl} className="w-full h-full border-0" title="预览" />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>此文件类型不支持预览</p>
                  <a href={previewUrl} download className="mt-3 inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-medium">
                    <Download className="w-3.5 h-3.5" /> 下载文件
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入 */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-1"
              >
                {/* 语音 */}
                <button
                  type="button"
                  onClick={handleVoice}
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                    listening
                      ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={listening ? '停止录音' : '语音输入'}
                >
                  <Mic className="w-4 h-4" />
                </button>
                {/* 文件 */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  title="上传文件"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                {/* 文件夹 */}
                <button
                  type="button"
                  onClick={handleDirButtonClick}
                  disabled={loading}
                  className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  title="上传文件夹"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                {/* 输入框 */}
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`向 ${activeAgent?.label} 提问...`}
                  disabled={loading}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
                />
                {/* 专家 */}
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  title="切换智能体"
                >
                  <span className="text-sm leading-none">{activeAgent?.emoji || '🤖'}</span>
                  <span className="max-w-[50px] truncate hidden sm:inline">{activeAgent?.label || '智能体'}</span>
                </button>
                {/* 路由模式 */}
                <button
                  type="button"
                  onClick={() => setRouteMode(m => m === 'auto' ? 'manual' : 'auto')}
                  className={`flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    routeMode === 'auto'
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'text-gray-500 dark:text-gray-400 bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={routeMode === 'auto' ? '自动路由：按内容分派' : '手动路由：仅当前智能体'}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{routeMode === 'auto' ? '自动' : '手动'}</span>
                </button>
                {/* 技能 */}
                <button
                  type="button"
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                  title="技能"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                </button>
                {/* 发送/停止 */}
                {loading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex-shrink-0 p-2 rounded-lg text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    title="停止"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex-shrink-0 p-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
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
