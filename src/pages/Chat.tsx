import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, MessageSquarePlus, BrainCircuit, Navigation, MessageSquare, Trash2, Search, Download } from 'lucide-react';
import { api, ROSTER } from '../api/client';
import type { Agent } from '../api/types';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ArtifactPanel from '../components/ArtifactPanel';
import { extractArtifact } from '../utils/artifact';
import type { Artifact } from '../utils/artifact';
import { readFiles, buildAttachmentText, formatSize } from '../utils/attachments';
import type { Attachment } from '../utils/attachments';

interface Msg {
  role: string;
  text: string;
  artifact?: Artifact;
}

// 单条对话（持久化单元）：含标题、绑定智能体、消息列表与时间戳
interface StoredConv {
  id: string;
  title: string;
  agentId?: string;
  messages: Msg[];
  createdAt: number;
  updatedAt: number;
}

// ============ 本地持久化抽象：Electron 走 userData 文件（升级保留），Web 走 localStorage 兜底 ============
function loadConversations(): Promise<{ conversations: StoredConv[]; activeId: string | null }> {
  const api0 = (window as any).electronAPI;
  if (api0?.loadConversations) return api0.loadConversations();
  try {
    const raw = localStorage.getItem('luoduo_conversations');
    if (!raw) return Promise.resolve({ conversations: [], activeId: null });
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.conversations)) return Promise.resolve({ conversations: [], activeId: null });
    return Promise.resolve(data);
  } catch {
    return Promise.resolve({ conversations: [], activeId: null });
  }
}

function saveConversations(data: { conversations: StoredConv[]; activeId: string | null }) {
  const api0 = (window as any).electronAPI;
  if (api0?.saveConversations) { api0.saveConversations(data); return; }
  localStorage.setItem('luoduo_conversations', JSON.stringify(data));
}

const newId = () => 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

function timeAgo(ts?: number): string {
  if (!ts) return '';
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}天前`;
  return new Date(ts).toLocaleDateString();
}

export default function Chat({ initialAgent }: { initialAgent?: string }) {
  const [conversations, setConversations] = useState<StoredConv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | undefined>(initialAgent);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  // 🔒 附件链路（2026-07-26 修复：原 onFile/onDir 是空壳，选了文件毫无反应）
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachNote, setAttachNote] = useState('');
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 当前会话派生
  const activeConv = conversations.find(c => c.id === activeId);
  const messages = activeConv?.messages ?? [];
  const visibleMessages = search.trim()
    ? messages.filter(m => (m.text || '').toLowerCase().includes(search.trim().toLowerCase()))
    : messages;

  // 启动即加载本地历史（跨更新不丢失，长记忆上下文）
  useEffect(() => {
    loadConversations().then((data) => {
      if (data.conversations.length > 0) {
        const aid = data.activeId && data.conversations.some(c => c.id === data.activeId)
          ? data.activeId
          : data.conversations[data.conversations.length - 1].id;
        setConversations(data.conversations);
        setActiveId(aid);
      } else {
        const id = newId();
        const nc: StoredConv = { id, title: '新对话', agentId: initialAgent, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
        setConversations([nc]);
        setActiveId(id);
        saveConversations({ conversations: [nc], activeId: id });
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换会话时同步绑定智能体
  useEffect(() => {
    const c = conversations.find(x => x.id === activeId);
    if (c) setAgentId(c.agentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // 选文件/文件夹 → 解析为附件并显示附件条
  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const { attachments: atts, skipped } = await readFiles(files);
    setAttachments(prev => [...prev, ...atts]);
    setAttachNote(skipped.length ? `已跳过：${skipped.join('、')}` : '');
    e.target.value = ''; // 允许重复选同一文件
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // 选本地音乐文件 → 直接本地播放（绝对合规，零外部依赖）
  const handlePickMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setActiveArtifact({ type: 'audio', lang: 'audio', code: url, title: f.name, url });
    e.target.value = '';
  };

  // 开放音乐（AudioLib 合规原创音源）：需配置 API Key
  const handleOpenMusic = async () => {
    const key = localStorage.getItem('luoduo_audiolib_key') || '';
    if (!key) { alert('未配置 AudioLib Key。请到「设置」页填写（audiolib.ai 注册免费获取），即可听开放原创音乐。'); return; }
    const library = (window.prompt('选择风格曲库（如 lofi / focus / rock / sleep，默认 lofi）', 'lofi') || 'lofi').trim();
    try {
      const r = await fetch('https://api.audiolib.ai/v1/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ library }),
      });
      const j = await r.json();
      if (j?.url) setActiveArtifact({ type: 'audio', lang: 'audio', code: j.url, title: `${library}.mp3`, url: j.url });
      else alert('AudioLib 返回异常：' + JSON.stringify(j));
    } catch (err: any) { alert('AudioLib 调用失败：' + (err?.message || err)); }
  };

  // 载入智能体名册（来自后端 /api/health）
  useEffect(() => {
    api.getAgents().then(r => setAgents(r.agents)).catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    if (initialAgent) { setAgentId(initialAgent); markAgent(initialAgent); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgent]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // 更新当前会话（用 prev 取最新态，落盘持久化）
  const updateActive = (updater: (c: StoredConv) => StoredConv) => {
    if (!activeId) return;
    setConversations(prev => {
      const next = prev.map(c => c.id === activeId ? updater(c) : c);
      saveConversations({ conversations: next, activeId });
      return next;
    });
  };

  // 绑定智能体到当前会话
  const markAgent = (id?: string) => {
    updateActive(c => ({ ...c, agentId: id }));
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;
    setInput('');
    const agentLabel = agentId ? (ROSTER[agentId]?.label || agentId) : 'AI军团';
    // 组装：文本附件拼进消息，图片附件走 images 字段
    const atts = attachments;
    setAttachments([]);
    setAttachNote('');
    const attText = buildAttachmentText(atts);
    const images = atts.filter(a => a.kind === 'image').map(a => a.content);
    const fullMessage = (text || '请分析这些附件') + attText;
    const shownText = atts.length
      ? (text || '请分析这些附件') + '\n📎 ' + atts.map(a => a.name).join('、')
      : text;
    const userMsg: Msg = { role: 'user', text: shownText };
    const placeholderMsg: Msg = { role: agentLabel, text: '' };
    // 首条消息自动取标题
    updateActive(c => {
      const title = c.messages.length === 0 && text ? text.slice(0, 24) : c.title;
      return { ...c, title, agentId, messages: [...c.messages, userMsg, placeholderMsg], updatedAt: Date.now() };
    });
    setLoading(true);
    try {
      const reply = await api.chat(fullMessage, agentId, images.length ? images : undefined);
      const { text: cleanText, artifact } = extractArtifact(reply);
      updateActive(c => {
        const msgs = [...c.messages];
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === agentLabel && msgs[i].text === '') {
            msgs[i] = { ...msgs[i], text: cleanText, artifact: artifact || undefined };
            break;
          }
        }
        return { ...c, messages: msgs, updatedAt: Date.now() };
      });
      // HTML / 音频 类产物自动开右侧预览
      if (artifact && (artifact.type === 'html' || artifact.type === 'audio')) setActiveArtifact(artifact);
    } catch (e: any) {
      const msg = e?.message || '请求失败，请检查后端连接';
      updateActive(c => {
        const msgs = [...c.messages];
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === agentLabel && msgs[i].text === '') { msgs[i] = { ...msgs[i], text: '⚠️ ' + msg }; break; }
        }
        return { ...c, messages: msgs };
      });
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    const id = newId();
    const nc: StoredConv = { id, title: '新对话', agentId, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setConversations(prev => {
      const next = [...prev, nc];
      saveConversations({ conversations: next, activeId: id });
      return next;
    });
    setActiveId(id);
    setInput(''); setLoading(false); setActiveArtifact(null); setAttachments([]); setAttachNote('');
  };

  const switchConv = (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
    setInput(''); setActiveArtifact(null); setAttachments([]); setAttachNote('');
    setConversations(prev => { saveConversations({ conversations: prev, activeId: id }); return prev; });
  };

  const deleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      let aid = activeId;
      if (aid === id) aid = next.length ? next[next.length - 1].id : null;
      if (next.length === 0) {
        const nid = newId();
        const nc: StoredConv = { id: nid, title: '新对话', agentId, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
        setActiveId(nid);
        saveConversations({ conversations: [nc], activeId: nid });
        return [nc];
      }
      setActiveId(aid);
      saveConversations({ conversations: next, activeId: aid });
      return next;
    });
  };

  // 导出当前会话为 Markdown（长记忆可带走）
  const exportConv = () => {
    if (!activeConv) return;
    const who = (role: string) => role === 'user' ? '我' : (role || 'AI');
    const lines = [
      `# ${activeConv.title || '对话'}`, '',
      `> 智能体：${activeConv.agentId ? (ROSTER[activeConv.agentId]?.label || activeConv.agentId) : '自由对话'}`,
      `> 更新：${new Date(activeConv.updatedAt).toLocaleString()}`,
      `> 消息数：${activeConv.messages.length}`, '',
    ];
    activeConv.messages.forEach(m => {
      lines.push(`## ${who(m.role)}`);
      lines.push(m.text || '');
      if (m.artifact) lines.push('', `> 产物[${m.artifact.type}]：${m.artifact.title}${m.artifact.url ? ' — ' + m.artifact.url : ''}`);
      lines.push('');
    });
    const md = lines.join('\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(activeConv.title || 'conversation').replace(/[\\/:*?"<>|]/g, '_')}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height: '100%', display: 'flex', fontFamily: 'sans-serif', background: '#ffffff', color: '#1a1a1a' }}>
      {/* Sidebar: 会话历史 + 智能体列表 */}
      <div style={{ width: 200, borderRight: '1px solid #ebebeb', background: '#fafafa', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 12, borderBottom: '1px solid #ebebeb' }}>
          <button onClick={startNew}
            style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />新对话
          </button>
        </div>
        {/* 对话历史（可切换 / 删除，跨更新保留） */}
        <div style={{ flex: '0 0 auto', maxHeight: '42%', overflowY: 'auto', padding: '8px 8px 4px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', padding: '2px 4px 6px', letterSpacing: 1 }}>对话历史</div>
          {conversations.length === 0 && (
            <div style={{ padding: '6px 4px', fontSize: 12, color: '#c0c0c0' }}>暂无历史</div>
          )}
          {conversations.map(c => (
            <div key={c.id} onClick={() => switchConv(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', marginBottom: 3, borderRadius: 8, cursor: 'pointer',
                background: c.id === activeId ? '#ececec' : 'transparent' }}>
              <MessageSquare size={13} style={{ flexShrink: 0, color: c.id === activeId ? '#1a1a1a' : '#9ca3af' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.title || '新对话'}
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>
                  {timeAgo(c.updatedAt)}{c.messages.length ? ` · ${c.messages.length}条` : ''}
                </div>
              </div>
              <button onClick={(e) => deleteConv(c.id, e)} title="删除对话"
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0c0c0', padding: '0 2px', fontSize: 13, lineHeight: 1, flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        {/* 智能体列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', padding: '2px 4px 6px', letterSpacing: 1 }}>智能体</div>
          {agents.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>载入智能体中…</div>
          )}
          {agents.map(a => (
            <button key={a.id} onClick={() => { setAgentId(a.id); markAgent(a.id); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                background: agentId === a.id ? '#ececec' : 'transparent',
                color: agentId === a.id ? '#1a1a1a' : '#4b5563', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 2 }}>{a.emoji}</span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 13, lineHeight: 1.3 }}>{a.label}</span>
                <span style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.role}{a.skills && a.skills.length > 0 ? ' · ' + a.skills.join('/') : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Bot size={20} color="#1a1a1a" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>对话</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {agentId ? `· ${ROSTER[agentId]?.label || agentId}` : '· 自由对话'}
          </span>
          <div style={{ flex: 1 }} />
          {/* 搜索当前对话 */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索对话"
            style={{ padding: '5px 10px', border: '1px solid #ebebeb', borderRadius: 8, fontSize: 12, width: 140, outline: 'none', color: '#1a1a1a' }}
          />
          {/* 导出当前对话为 MD */}
          <button onClick={exportConv} title="导出当前对话为 Markdown" style={{ marginLeft: 6, padding: '5px 10px', border: '1px solid #ebebeb', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#4b5563', display: 'inline-flex', alignItems: 'center' }}>
            <Download size={14} />
          </button>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 2 }}>
            <button onClick={() => { setAgentId(undefined); markAgent(undefined); }}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
                background: !agentId ? 'white' : 'transparent', color: !agentId ? '#1a1a1a' : '#6b7280' }}>
              <BrainCircuit size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />自由对话
            </button>
            <button onClick={() => {}}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
                background: agentId ? 'white' : 'transparent', color: agentId ? '#1a1a1a' : '#6b7280' }}>
              <Navigation size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />指定智能体
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {!loaded ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0c0c0', fontSize: 13 }}>载入本地对话中…</div>
          ) : messages.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquarePlus size={48} style={{ opacity: 0.5, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 14 }}>{agentId ? `与 ${ROSTER[agentId]?.label || agentId} 开始对话` : '选择一个智能体开始对话'}</p>
                <p style={{ fontSize: 12, marginTop: 6, color: '#c0c0c0' }}>让我生成网页 / 小游戏，右侧会自动开预览面板</p>
              </div>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              无匹配「{search}」的对话
            </div>
          ) : visibleMessages.map((m, i) => (
            <ChatMessage
              key={i}
              msg={m}
              streaming={loading && m.role !== 'user' && m.text === ''}
              onOpenArtifact={setActiveArtifact}
            />
          ))}
        </div>

        {/* 附件条：选中的文件在这里显示，可单个移除 */}
        {(attachments.length > 0 || attachNote) && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid #ebebeb', background: '#fafafa', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {attachments.map((a, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                  background: 'white', border: '1px solid #ebebeb', borderRadius: 8, fontSize: 12, color: '#1a1a1a' }}>
                  {a.kind === 'image' ? '🖼' : '📄'} {a.name}
                  <span style={{ color: '#9ca3af' }}>{formatSize(a.size)}</span>
                  <button onClick={() => removeAttachment(i)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, fontSize: 13, lineHeight: 1 }}
                    title="移除">×</button>
                </span>
              ))}
            </div>
            {attachNote && <div style={{ marginTop: 4, fontSize: 11, color: '#9ca3af' }}>{attachNote}</div>}
          </div>
        )}

        {/* Input */}
        <div style={{ borderTop: '1px solid #ebebeb', flexShrink: 0 }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            onStop={() => setLoading(false)}
            onFile={handlePick}
            onDir={handlePick}
            onMusic={handlePickMusic}
            onOpenMusic={handleOpenMusic}
            onVoice={() => {}}
            loading={loading}
            placeholder={agentId ? `对 ${ROSTER[agentId]?.label || agentId} 说点什么…` : '自由对话...'}
          />
        </div>
      </div>

      {/* 右侧预览面板 */}
      {activeArtifact && (
        <ArtifactPanel artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />
      )}
    </div>
  );
}
