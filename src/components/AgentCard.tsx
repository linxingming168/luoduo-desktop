import { FileText, Code as CodeIcon, Hash, FileSpreadsheet, User } from 'lucide-react';
import type { Agent } from '../api/types';

interface Props {
  agent: Agent;
  onClick: (id: string) => void;
}

const docTypeIcons: Record<string, React.ReactNode> = {
  docx: <FileText className="w-5 h-5" />,
  code: <CodeIcon className="w-5 h-5" />,
  none: <Hash className="w-5 h-5" />,
  xlsx: <FileSpreadsheet className="w-5 h-5" />,
};

const docTypeColors: Record<string, string> = {
  docx: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  code: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  none: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  xlsx: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function AgentCard({ agent, onClick }: Props) {
  const colorClass = docTypeColors[agent.doc_type] || docTypeColors.none;

  return (
    <button
      onClick={() => onClick(agent.id)}
      className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left w-full group"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        {docTypeIcons[agent.doc_type] || <User className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {agent.label || agent.id}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
          {agent.id}
        </div>
      </div>
      <div className="flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
