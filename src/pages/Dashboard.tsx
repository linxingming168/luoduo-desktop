import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Agent } from '../api/types';
import AgentCard from '../components/AgentCard';
import { useServerHealth } from '../hooks/useServerHealth';
import { Search, Bot, Activity } from 'lucide-react';

interface Props {
  onChat: (agentId: string) => void;
}

export default function Dashboard({ onChat }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState('');
  const { online, health } = useServerHealth();

  useEffect(() => {
    api.getAgents().then(res => setAgents(res.agents || [])).catch(() => {});
  }, []);

  const filtered = agents.filter(a =>
    (a.label || a.id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">智能体面板</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {agents.length} 个智能体 · {online ? '服务器在线' : '服务器离线'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {health && (
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {health.skills && `技能 ${health.skills}`}
              {health.knowledge && ` · 知识 ${health.knowledge}`}
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
            online
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <Activity className="w-3 h-3" />
            {online ? '在线' : '离线'}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索智能体..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Agent Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{search ? '没有匹配的智能体' : '正在加载智能体列表...'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(agent => (
            <AgentCard key={agent.id} agent={agent} onClick={onChat} />
          ))}
        </div>
      )}
    </div>
  );
}
