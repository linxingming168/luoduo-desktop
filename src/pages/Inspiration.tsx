import { useState } from 'react';
import { Lightbulb, Heart, MessageSquare, Share2, Plus, Search, ThumbsUp, Clock } from 'lucide-react';

interface Idea {
  id: number;
  title: string;
  desc: string;
  category: string;
  votes: number;
  comments: number;
  time: string;
  status: '待评估' | '已采纳' | '开发中';
}

const mockIdeas: Idea[] = [
  { id: 1, title: 'AI 自动生成日报周报', desc: '根据聊天记录自动整理每日/每周工作汇报', category: '效率工具', votes: 23, comments: 5, time: '2小时前', status: '开发中' },
  { id: 2, title: '多语言实时翻译插件', desc: '对话中一键翻译为英文/日文/韩文', category: '智能体', votes: 18, comments: 3, time: '昨天', status: '待评估' },
  { id: 3, title: '语音唤醒功能', desc: '说"嘿落朵"直接唤醒AI助手', category: '交互体验', votes: 15, comments: 7, time: '3天前', status: '已采纳' },
  { id: 4, title: '知识库自动爬取网页', desc: '输入网址自动抓取内容纳入知识库', category: '知识库', votes: 12, comments: 2, time: '5天前', status: '待评估' },
  { id: 5, title: '智能体协作工作流', desc: '多个智能体按流程自动接力完成任务', category: '自动化', votes: 9, comments: 4, time: '1周前', status: '待评估' },
];

const categories = ['全部', '效率工具', '智能体', '交互体验', '知识库', '自动化'];

export default function Inspiration() {
  const [ideas] = useState<Idea[]>(mockIdeas);
  const [category, setCategory] = useState('全部');
  const [showSubmit, setShowSubmit] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const filtered = category === '全部' ? ideas : ideas.filter(i => i.category === category);

  const statusColor = (s: string) => {
    switch (s) {
      case '已采纳': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case '开发中': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">灵感收集</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">你的每一个想法，都可能成为下一个功能</p>
        </div>
        <button
          onClick={() => setShowSubmit(!showSubmit)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-4 h-4" />
          提交灵感
        </button>
      </div>

      {/* Submit Form */}
      {showSubmit && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">💡 新灵感</h3>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="给你的灵感取个标题..."
            className="w-full px-3 py-2 mb-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <textarea
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            rows={3}
            placeholder="详细描述你的想法..."
            className="w-full px-3 py-2 mb-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowSubmit(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">取消</button>
            <button className="px-4 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600">提交</button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              category === c
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Ideas List */}
      <div className="space-y-3">
        {filtered.map(idea => (
          <div key={idea.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              {/* Vote */}
              <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-500 transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{idea.votes}</span>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{idea.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(idea.status)}`}>{idea.status}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{idea.desc}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{idea.category}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {idea.comments}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {idea.time}</span>
                </div>
              </div>
              <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">该分类下还没有灵感</p>
          <p className="text-gray-400 text-xs mt-1">点击上方「提交灵感」分享你的想法</p>
        </div>
      )}
    </div>
  );
}
