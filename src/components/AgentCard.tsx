import type { Agent } from '../api/types';

interface Props {
  agent: Agent;
  onClick: (id: string) => void;
}

export default function AgentCard({ agent, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(agent.id)}
      className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all text-left w-full group"
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-2xl leading-none">
        {agent.emoji || '🤖'}
      </div>
      <div className="flex-1 min-w-0">
        {/* 主标识：名称，放最大 */}
        <div className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
          {agent.label || agent.id}
        </div>
        {/* 副标：角色 / 技能 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {agent.role || '智能体'}
        </div>
        {/* ID 最小最弱（系统识别用，人不需要盯着） */}
        <div className="text-[10px] text-gray-400 dark:text-gray-600 font-mono truncate mt-0.5">
          {agent.id}
        </div>
      </div>
    </button>
  );
}
