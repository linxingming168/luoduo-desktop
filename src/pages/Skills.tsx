import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { SkillEntry } from '../api/types';
import { Search, Wrench, FileText } from 'lucide-react';

export default function Skills() {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.listSkills().then(list => {
      setSkills(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const timer = setTimeout(() => {
        api.searchSkills(search).then(res => setSkills(res)).catch(() => {});
      }, 300);
      return () => clearTimeout(timer);
    } else {
      api.listSkills().then(list => setSkills(list)).catch(() => {});
    }
  }, [search]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="w-6 h-6 text-emerald-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">技能库</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">AI 军团掌握的全部技能</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索技能..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : skills.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{search ? '没有匹配的技能' : '技能库为空'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div key={skill.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {skill.title || `技能 #${skill.id}`}
                  </span>
                  {skill.category && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {skill.category}
                    </span>
                  )}
                </div>
                <svg className={`w-4 h-4 text-gray-400 ml-2 flex-shrink-0 transition-transform ${expanded === skill.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expanded === skill.id && (
                <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                  {skill.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{skill.description}</p>
                  )}
                  {skill.trigger && (
                    <div className="text-xs">
                      <span className="text-gray-500 dark:text-gray-400">触发: </span>
                      <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">{skill.trigger}</code>
                    </div>
                  )}
                  {skill.steps && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">步骤: </span>
                      <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">{skill.steps}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
