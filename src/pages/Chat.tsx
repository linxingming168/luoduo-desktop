import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, MessageSquarePlus, BrainCircuit, Navigation } from 'lucide-react';
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

export default function Chat({ initialAgent }: { initialAgent?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | undefined>(initialAgent);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  // 🔒 附件链路（2026-07-26 修复：原 onFile/onDir 是空壳，选了文件毫无反应）
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachNote, setAttachNote] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (initialAgent) setAgentId(initialAgent);
  }, [initialAgent]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

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
    setMessages(prev => [...prev, { role: 'user', text: shownText }, { role: agentLabel, text: '' }]);
    setLoading(true);
    try {
      const reply = await api.chat(fullMessage, agentId, images.length ? images : undefined);
      const { text: cleanText, artifact } = extractArtifact(reply);
      setMessages(prev => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === agentLabel && next[i].text === '') {
            next[i] = { ...next[i], text: cleanText, artifact: artifact || undefined };
            break;
          }
        }
        return next;
      });
      // HTML / 音频 类产物自动开右侧预览
      if (artifact && (artifact.type === 'html' || artifact.type === 'audio')) setActiveArtifact(artifact);
    } catch (e: any) {
      const msg = e?.message || '请求失败，请检查后端连接';
      setMessages(prev => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === agentLabel && next[i].text === '') { next[i] = { ...next[i], text: '⚠️ ' + msg }; break; }
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => { setMessages([]); setInput(''); setLoading(false); setActiveArtifact(null); setAttachments([]); setAttachNote(''); };

  return (
    <div style={{ height: '100%', display: 'flex', fontFamily: 'sans-serif', background: '#ffffff', color: '#1a1a1a' }}>
      {/* Sidebar: 智能体列表 */}
      <div style={{ width: 192, borderRight: '1px solid #ebebeb', background: '#fafafa', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 12, borderBottom: '1px solid #ebebeb' }}>
          <button onClick={startNew}
            style={{ width: '100%', padding: '8px 12px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />新对话
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {agents.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>载入智能体中…</div>
          )}
          {agents.map(a => (
            <button key={a.id} onClick={() => setAgentId(a.id)}
              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                background: agentId === a.id ? '#f1f1f1' : 'transparent',
                color: agentId === a.id ? '#1a1a1a' : '#4b5563' }}>
              <span style={{ marginRight: 6 }}>{a.emoji}</span>{a.label}
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
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setAgentId(undefined)}
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
          {messages.length === 0 && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquarePlus size={48} style={{ opacity: 0.5, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 14 }}>{agentId ? `与 ${ROSTER[agentId]?.label || agentId} 开始对话` : '选择一个智能体开始对话'}</p>
                <p style={{ fontSize: 12, marginTop: 6, color: '#c0c0c0' }}>让我生成网页 / 小游戏，右侧会自动开预览面板</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
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
