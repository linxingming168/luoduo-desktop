import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { KnowledgeEntry } from '../api/types';
import { Search, BookOpen, FileText } from 'lucide-react';

export default function Knowledge() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<{ status?: number; message?: string; diagnostic?: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .listKnowledge()
      .then(list => {
        setEntries(list);
        setLoading(false);
      })
      .catch(e => {
        setError({ status: e?.status, message: e?.message });
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const timer = setTimeout(() => {
        api
          .searchKnowledge(search)
          .then(res => {
            setEntries(res);
            setError(null);
          })
          .catch(e => setError({ status: e?.status, message: e?.message }));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      api
        .listKnowledge()
        .then(list => {
          setEntries(list);
          setError(null);
        })
        .catch(e => setError({ status: e?.status, message: e?.message }));
    }
  }, [search]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">知识库</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">大脑已掌握的知识</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索知识..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
        />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 text-sm text-gray-800 dark:text-gray-200">
          <p className="font-medium">无法加载知识库</p>
          <p className="mt-1 text-xs opacity-80">
            {error.status === 401 || error.status === 403
              ? `后端返回 ${error.status}：未在「设置 → 服务器地址」配置 API Key，或 Key 无效。请填入后端管理员提供的正确 API Key 并保存，再重开本页。`
              : `${error.message || '请求失败'}（HTTP ${error.status || '网络错误'}）`}
          </p>
          {error.diagnostic && (
            <pre className="mt-2 text-[11px] leading-relaxed whitespace-pre-wrap break-all bg-black/5 dark:bg-white/5 rounded p-2 opacity-70">
              后端原始响应（前 600 字）：{error.diagnostic}
            </pre>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{search ? '没有匹配的知识' : '知识库为空'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {entry.title || entry.question}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === entry.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expanded === entry.id && (
                <div className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2 mt-0">
                  <div className="markdown-body">{entry.answer}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
