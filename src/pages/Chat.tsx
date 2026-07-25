import { useState, useEffect } from 'react';
import { Bot, Plus, MessageSquarePlus, BrainCircuit, Navigation, Send, Loader2 } from 'lucide-react';

export default function Chat({ initialAgent }: { initialAgent?: string }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ height: '100%', display: 'flex', fontFamily: 'sans-serif', background: '#f9fafb', color: '#111' }}>
      {/* Sidebar */}
      <div style={{ width: 192, borderRight: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
          <button style={{ width: '100%', padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />新对话
          </button>
        </div>
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>暂无对话</div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Bot size={20} color="#3b82f6" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>对话</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
            <button style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', background: 'white', color: '#3b82f6' }}>
              <BrainCircuit size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />自由对话
            </button>
            <button style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', background: 'transparent', color: '#6b7280' }}>
              <Navigation size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />任务工作台
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          <div style={{ textAlign: 'center' }}>
            <MessageSquarePlus size={48} style={{ opacity: 0.5, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14 }}>选择一个智能体开始对话</p>
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder="自由对话..."
              style={{ flex: 1, padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 9999, fontSize: 14, outline: 'none' }} />
            <Send size={18} color={input.trim() ? '#3b82f6' : '#d1d5db'} style={{ cursor: input.trim() ? 'pointer' : 'not-allowed' }} />
          </div>
        </div>
      </div>
    </div>
  );
}