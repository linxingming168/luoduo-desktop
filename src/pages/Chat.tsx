import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import type { Agent } from '../api/types';
import ChatBubble from '../components/ChatBubble';
import { Send, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
}

export default function Chat({ initialAgent }: { initialAgent?: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>(initialAgent || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getAgents().then(res => {
      setAgents(res.agents || []);
      if (!selectedAgent && res.agents?.length) {
        setSelectedAgent(res.agents[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 如果从外部传入了 agent，选中它并清空消息
  useEffect(() => {
    if (initialAgent && initialAgent !== selectedAgent) {
      setSelectedAgent(initialAgent);
      setMessages([]);
    }
  }, [initialAgent]);

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.executeAgent(selectedAgent, { instruction: input.trim() });
      const reply = res.reply || res.error || '(空响应)';
      const assistantMsg: Message = {
        role: 'assistant',
        content: reply,
        agentId: selectedAgent,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `请求失败: ${err.message}`,
        agentId: selectedAgent,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Agent list sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-2 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-2">
          选择智能体
        </div>
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => { setSelectedAgent(agent.id); setMessages([]); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedAgent === agent.id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className="truncate">{agent.label || agent.id}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 truncate font-mono">{agent.id}</div>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedAgent ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">请选择一个智能体开始对话</p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <Bot className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">开始与 {agents.find(a => a.id === selectedAgent)?.label || selectedAgent} 对话</p>
                </div>
              )}
              {messages.map((msg, i) => (
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

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <form
                onSubmit={e => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`向 ${agents.find(a => a.id === selectedAgent)?.label || selectedAgent} 提问...`}
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
    </div>
  );
}
