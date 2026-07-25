import { useState, useRef, useEffect } from 'react';
import { api, decorateAgent } from '../api/client';
import type { Agent } from '../api/types';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { Bot, Plus, Search, MessageSquarePlus, X, Eye, FileText, BrainCircuit, Navigation } from 'lucide-react';

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
  try { return JSON.parse(localStorage.getItem(CONV_KEY) || '[]'); }
  catch { return []; }
}
function saveConvs(list: Conversation[]) { localStorage.setItem(CONV_KEY, JSON.stringify(list)); }
function uid(): string { return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export default function Chat({ initialAgent }: { initialAgent?: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [convs, setConvs] = useState<Conversation[]>(() => loadConvs());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState('');
  const [chatMode, setChatMode] = useState<'chat' | 'task'>(() => {
    return (localStorage.getItem('luoduo_chat_mode') as 'chat' | 'task') || 'chat';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const updateConv = (id: string, updater: (c: Conversation) => Conversation) => {
    setConvs(prev => { const next = prev.map(c => (c.id === id ? updater(c) : c)); saveConvs(next); return next; });
  };

  const active = convs.find(c => c.id === activeId) || null;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [active?.messages, streamingText]);

  useEffect(() => {
    api.getAgents().then(r => setAgents(r.agents || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialAgent && agents.length > 0) {
      const existing = convs.find(c => c.agentId === initialAgent);
      if (existing) { setActiveId(existing.id); return; }
      newConversation(initialAgent);
    }
  }, [initialAgent, agents]);

  const newConversation = (agentId: string) => {
    const id = uid();
    const c: Conversation = { id, agentId, messages: [], createdAt: Date.now() };
    setConvs(prev => { const next = [c, ...prev]; saveConvs(next); return next; });
    setActiveId(id);
    setShowPicker(false);
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || !active) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: msg };

    // Update conversation with user message
    updateConv(active.id, c => ({ ...c, messages: [...c.messages, userMsg] }));

    setLoading(true);
    setStreamingText('');

    const mode = localStorage.getItem('luoduo_chat_mode') || 'chat';

    if (mode === 'chat') {
      // SSE streaming
      const key = localStorage.getItem('luoduo_api_key') || '';
      const urlParams = new URLSearchParams({ api_key: key, session_id: active.id, message: msg, mode: 'chat' });

      try {
        const resp = await fetch(`https://tyb.ap100168.com/api/chat/stream?${urlParams}`);
        if (!resp.ok) { setStreamingText(`[请求失败 ${resp.status}]`); setLoading(false); return; }

        const reader = resp.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: token')) continue;
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.content) { fullReply += d.content; setStreamingText(fullReply); }
              } catch {}
            }
          }
        }

        // Save assistant reply
        if (fullReply) {
          updateConv(active.id, c => ({
            ...c, messages: [...c.messages, { role: 'assistant', content: fullReply, agentId: 'AI' }]
          }));
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') setStreamingText(`[错误: ${e.message}]`);
      }
      setStreamingText('');
      setLoading(false);

    } else {
      // Task mode (executeAgent)
      try {
        const res = await api.executeAgent(active.agentId, { instruction: msg }, abortRef.current?.signal);
        const reply = res.reply || res.error || '(空响应)';
        const artifact = res.artifact || '';
        const downloadUrl = res.download_url || '';
        updateConv(active.id, c => ({
          ...c, messages: [...c.messages, { role: 'assistant', content: reply, agentId: active.agentId, artifact, downloadUrl }]
        }));
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          updateConv(active.id, c => ({
            ...c, messages: [...c.messages, { role: 'assistant', content: `[执行失败: ${e.message}]`, agentId: active.agentId }]
          }));
        }
      }
      setLoading(false);
    }
  };

  const switchChatMode = (mode: 'chat' | 'task') => {
    localStorage.setItem('luoduo_chat_mode', mode);
    setChatMode(mode);
  };

  const handleStop = () => { abortRef.current?.abort(); setLoading(false); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const preview = text.length > 2000 ? text.slice(0, 2000) + '\n...（截断，共' + text.length + '字）' : text;
      setInput(prev => (prev ? prev + '\n' : '') + `[文件: ${file.name}]\n${preview}`);
    };
    reader.readAsText(file);
  };

  const handleDirUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list = Array.from(files).slice(0, 20).map(f => `  ${f.name} (${(f.size / 1024).toFixed(1)}KB)`).join('\n');
    setInput(prev => (prev ? prev + '\n' : '') + `[上传文件夹 ${files.length} 个文件]\n${list}`);
  };

  const handleVoice = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) { alert('浏览器不支持语音识别'); return; }
      const sr = new SpeechRecognition();
      sr.lang = 'zh-CN';
      sr.onresult = (e: any) => {
        const t = Array.from(e.results).map((res: any) => res[0].transcript).join('');
        setInput(prev => prev + t);
      };
      sr.start();
    } catch { alert('语音启动失败'); }
  };

  const activeMsgs = active?.messages || [];
  const isStreaming = loading && chatMode === 'chat';
  const displayMsgs = isStreaming
    ? [...activeMsgs, { role: 'assistant' as const, content: streamingText }]
    : activeMsgs;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Bot className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            对话 · {active ? decorateAgent(active.agentId).label : '未选择'}
          </span>
          <div className="flex-1" />

          {/* Mode switch */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button onClick={() => switchChatMode('chat')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                chatMode === 'chat' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'
              }`}>
              <BrainCircuit className="w-3.5 h-3.5 inline mr-1" />自由对话
            </button>
            <button onClick={() => switchChatMode('task')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                chatMode === 'task' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'
              }`}>
              <Navigation className="w-3.5 h-3.5 inline mr-1" />任务工作台
            </button>
          </div>

          {/* New chat */}
          <button onClick={() => setShowPicker(!showPicker)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Agent picker */}
        {showPicker && (
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder="搜索智能体..." />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {agents.filter(a => a.label?.includes(search) || a.role?.includes(search)).map(a => (
                <button key={a.id} onClick={() => newConversation(a.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <span className="text-base">{a.emoji || '🤖'}</span>
                  <span className="truncate">{a.label || a.id}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation sidebar */}
        <div className="flex-1 flex">
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto flex-shrink-0">
            {convs.map(c => (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-2.5 text-xs border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                  c.id === activeId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                }`}>
                <div className="font-medium truncate">{decorateAgent(c.agentId).label}</div>
                <div className="text-[10px] opacity-60 mt-0.5 truncate">
                  {c.messages[c.messages.length - 1]?.content.slice(0, 30) || '新对话'}
                </div>
              </button>
            ))}
            {convs.length === 0 && (
              <div className="p-3 text-center text-xs text-gray-400">暂无对话</div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {displayMsgs.length === 0 && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <MessageSquarePlus className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm">选择一个智能体开始对话</p>
                </div>
              )}
              {displayMsgs.map((m, i) => (
                <ChatMessage key={i} msg={{ role: m.role, text: m.content, artifact: m.artifact, downloadUrl: m.downloadUrl }}
                  streaming={isStreaming && i === displayMsgs.length - 1}
                  onPreview={(url, label) => { setPreviewUrl(url); setPreviewLabel(label); }} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={handleStop}
              onFile={handleFileUpload}
              onDir={handleDirUpload}
              onVoice={handleVoice}
              loading={loading}
              placeholder={chatMode === 'chat' ? "自由对话..." : "描述任务..."}
            />
          </div>
        </div>
      </div>

      {/* Preview panel */}
      {previewUrl && (
        <div className="w-[480px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{previewLabel || '预览'}</span>
            <button onClick={() => setPreviewUrl(null)} className="p-1 rounded text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            {(previewUrl.endsWith('.html') || previewUrl.endsWith('.htm')) ? (
              <iframe src={previewUrl} className="w-full h-full border-0" title="预览" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="w-12 h-12 mb-2" />
                <p className="text-xs">此文件类型不支持预览</p>
                <a href={previewUrl} download
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600">下载文件</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
