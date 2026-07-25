import { useState, useEffect } from 'react';
import { Bot, MessageSquare, BookOpen, Wrench, Settings, LayoutDashboard, Target, FolderOpen, Monitor, Radio, Zap, Lightbulb, ChevronDown, ChevronRight, Coins, Gift, ExternalLink, Sparkles, GitBranch } from 'lucide-react';
import StatusDot from './StatusDot';

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
  online: boolean;
  darkMode: boolean;
  onToggleDark: () => void;
}

const mainNavItems = [
  { id: 'dashboard', label: '智能体面板', icon: LayoutDashboard },
  { id: 'chat', label: '对话', icon: MessageSquare },
  { id: 'taskhall', label: '任务大厅', icon: Target },
  { id: 'projects', label: '项目管理', icon: FolderOpen },
  { id: 'automation', label: '自动化', icon: Zap },
  { id: 'knowledge', label: '知识库', icon: BookOpen },
  { id: 'skills', label: '技能库', icon: Wrench },
];

const moreNavItems = [
  { id: 'workflow', label: '工作流', icon: GitBranch },
  { id: 'inspiration', label: '灵感收集', icon: Lightbulb },
  { id: 'tools', label: '工具箱', icon: Wrench },
  { id: 'local', label: '本地控制台', icon: Monitor },
  { id: 'remote', label: '远程助手', icon: Radio },
];

export default function Sidebar({ currentPage, onNavigate, online, darkMode, onToggleDark }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [points, setPoints] = useState(() => {
    const saved = localStorage.getItem('luoduo_points_balance');
    return saved ? parseInt(saved) : 0;
  });
  const [claimed, setClaimed] = useState(() => {
    const today = new Date().toDateString();
    return localStorage.getItem('luoduo_points_claim_date') === today;
  });

  const handleClaim = () => {
    if (claimed) return;
    const today = new Date().toDateString();
    const newBalance = points + 150;
    setPoints(newBalance);
    setClaimed(true);
    localStorage.setItem('luoduo_points_balance', String(newBalance));
    localStorage.setItem('luoduo_points_claim_date', today);
  };

  useEffect(() => {
    if (moreNavItems.some(item => item.id === currentPage)) {
      setMoreOpen(true);
    }
  }, [currentPage]);

  const NavBtn = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
    <button
      key={id}
      onClick={() => onNavigate(id)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        currentPage === id
          ? 'bg-blue-600/20 text-blue-400 font-medium'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );

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

      {/* Navigation - Main */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {mainNavItems.map(item => <NavBtn key={item.id} {...item} />)}

        {/* 更多 (More) */}
        <div className="pt-2">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700/20 transition-colors uppercase tracking-wider"
          >
            {moreOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            更多
          </button>
          {moreOpen && (
            <div className="mt-1 space-y-1 pl-2 border-l border-gray-700/30 ml-1.5">
              {moreNavItems.map(item => <NavBtn key={item.id} {...item} />)}
            </div>
          )}
        </div>
      </nav>

      {/* 落朵权益值 */}
      <div className="px-3 py-3 border-t border-gray-700/50">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">落朵权益值</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-amber-400">{points}</span>
            <span className="text-xs text-amber-500/80">积分</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClaim}
              disabled={claimed}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                claimed
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              {claimed ? '今日已领取' : '领取150积分'}
            </button>
            <button
              onClick={() => window.open('https://tyb.ap100168.com/forum', '_blank')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
              title="论坛"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-1.5 text-[10px] text-amber-500/60">
            <Sparkles className="w-3 h-3 inline mr-0.5" />
            每日150积分 · 论坛积分已打通
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="p-3 border-t border-gray-700/50">
        <div className="flex items-center justify-between px-1">
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
