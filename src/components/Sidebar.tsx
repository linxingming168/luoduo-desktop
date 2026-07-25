import { Bot, MessageSquare, BookOpen, Wrench, Settings, LayoutDashboard, Target, FolderOpen, Monitor, Radio, Zap } from 'lucide-react';
import StatusDot from './StatusDot';

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
  online: boolean;
  darkMode: boolean;
  onToggleDark: () => void;
}

const navItems = [
  { id: 'dashboard', label: '智能体面板', icon: LayoutDashboard },
  { id: 'taskhall', label: '任务大厅', icon: Target },
  { id: 'projects', label: '项目管理', icon: FolderOpen },
  { id: 'chat', label: '对话', icon: MessageSquare },
  { id: 'automation', label: '自动化', icon: Zap },
  { id: 'knowledge', label: '知识库', icon: BookOpen },
  { id: 'skills', label: '技能库', icon: Wrench },
  { id: 'local', label: '本地控制台', icon: Monitor },
  { id: 'remote', label: '远程助手', icon: Radio },
];

export default function Sidebar({ currentPage, onNavigate, online, darkMode, onToggleDark }: Props) {
  return (
    <div className="w-60 flex-shrink-0 bg-[--color-sidebar] text-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">AI军团</div>
            <div className="text-xs text-gray-400">落朵大脑</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              currentPage === id
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="p-3 border-t border-gray-700/50 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <StatusDot online={online} />
          <div className="flex gap-1">
            <button
              onClick={onToggleDark}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
              title={darkMode ? '切换亮色' : '切换暗色'}
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentPage === 'settings'
                  ? 'text-blue-400 bg-blue-600/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
