import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, MessageSquarePlus, BrainCircuit, Navigation } from 'lucide-react';
import { api, ROSTER } from '../api/client';
import type { Agent } from '../api/types';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';

interface Msg {
  role: string;
  text: string;
  artifact?: string;
  downloadUrl?: string;
}

export default function Chat({ initialAgent }: { initialAgent?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | undefined>(initialAgent);
  const [agents, setAgents] = useState<Agent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (!text || loading) return;
    setInput('');
    const agentLabel = agentId ? (ROSTER[agentId]?.label || agentId) : 'AI军团';
    // 追加用户消息 + 一个空的助手占位（ loading 期间显示思考中）
    setMessages(prev => [...prev, { role: 'user', text }, { role: agentLabel, text: '' }]);
    setLoading(true);
    try {
      const reply = await api.chat(text, agentId);
      setMessages(prev => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === agentLabel && next[i].text === '') { next[i] = { ...next[i], text: reply }; break; }
        }
        return next;
      });
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

  const startNew = () => { setMessages([]); setInput(''); setLoading(false); };

  return (
    <div style={{ height: '100%', display: 'flex', fontFamily: 'sans-serif', background: '#f9fafb', color: '#111' }}>
      {/* Sidebar: 智能体列表 */}
      <div style={{ width: 192, borderRight: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={startNew}
            style={{ width: '100%', padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
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
                background: agentId === a.id ? '#e0edff' : 'transparent',
                color: agentId === a.id ? '#1d4ed8' : '#374151' }}>
              <span style={{ marginRight: 6 }}>{a.emoji}</span>{a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Bot size={20} color="#3b82f6" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>对话</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {agentId ? `· ${ROSTER[agentId]?.label || agentId}` : '· 自由对话'}
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setAgentId(undefined)}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
                background: !agentId ? 'white' : 'transparent', color: !agentId ? '#3b82f6' : '#6b7280' }}>
              <BrainCircuit size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />自由对话
            </button>
            <button onClick={() => {}}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer',
                background: agentId ? 'white' : 'transparent', color: agentId ? '#3b82f6' : '#6b7280' }}>
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
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} msg={m} streaming={loading && m.role !== 'user' && m.text === ''} />
          ))}
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            onStop={() => setLoading(false)}
            onFile={() => {}}
            onDir={() => {}}
            onVoice={() => {}}
            loading={loading}
            placeholder={agentId ? `对 ${ROSTER[agentId]?.label || agentId} 说点什么…` : '自由对话...'}
          />
        </div>
      </div>
    </div>
  );
}
