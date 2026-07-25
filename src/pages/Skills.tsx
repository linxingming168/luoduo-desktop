import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api/client';
import type { SkillEntry } from '../api/types';
import { Search, Wrench, FileText, Folder, Lock, Unlock, CheckCircle2, Circle } from 'lucide-react';

const SEL_KEY = 'luoduo_skills_selected';
const LOCK_KEY = 'luoduo_skills_locked';

function loadSelected(): Set<number> {
  try {
    const arr = JSON.parse(localStorage.getItem(SEL_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'number') : []);
  } catch {
    return new Set();
  }
}
function saveSelected(s: Set<number>) {
  localStorage.setItem(SEL_KEY, JSON.stringify(Array.from(s)));
}

export default function Skills() {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<{ status?: number; message?: string; diagnostic?: string } | null>(null);

  const [selected, setSelected] = useState<Set<number>>(loadSelected);
  const [locked, setLocked] = useState<boolean>(() => localStorage.getItem(LOCK_KEY) === '1');
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const didInit = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .listSkills()
      .then(list => {
        setSkills(list as SkillEntry[]);
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
          .searchSkills(search)
          .then(res => {
            setSkills(res as SkillEntry[]);
            setError(null);
          })
          .catch(e => setError({ status: e?.status, message: e?.message }));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      api
        .listSkills()
        .then(list => {
          setSkills(list as SkillEntry[]);
          setError(null);
        })
        .catch(e => setError({ status: e?.status, message: e?.message }));
    }
  }, [search]);

  // 持久化（仅首次加载后开始写，避免覆盖）
  useEffect(() => {
    if (!didInit.current) return;
    saveSelected(selected);
  }, [selected]);
  useEffect(() => {
    if (!didInit.current) return;
    localStorage.setItem(LOCK_KEY, locked ? '1' : '0');
  }, [locked]);
  useEffect(() => {
    didInit.current = true;
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, SkillEntry[]>();
    const base = onlyEnabled ? skills.filter(s => selected.has(s.id)) : skills;
    for (const s of base) {
      const cat = (s.category && s.category.trim()) || '未分类';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const A = a[0];
      const B = b[0];
      if (A === '未分类') return 1;
      if (B === '未分类') return -1;
      return A.localeCompare(B, 'zh');
    });
  }, [skills, selected, onlyEnabled]);

  const toggle = (id: number) => {
    if (locked) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleCategory = (items: SkillEntry[]) => {
    if (locked) return;
    setSelected(prev => {
      const next = new Set(prev);
      const allOn = items.every(s => next.has(s.id));
      for (const s of items) {
        if (allOn) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  };
  const selectAll = () => {
    if (locked) return;
    setSelected(new Set(skills.map(s => s.id)));
  };
  const clearAll = () => {
    if (locked) return;
    setSelected(new Set());
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="w-6 h-6 text-emerald-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">技能库</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">AI 军团掌握的全部技能（按分类）</p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索技能..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* 工具条：勾选筛选 + 锁定 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          已启用 <b className="text-emerald-600 dark:text-emerald-400">{selected.size}</b> / 共 {skills.length}
        </span>
        <button
          onClick={selectAll}
          disabled={locked}
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          全选
        </button>
        <button
          onClick={clearAll}
          disabled={locked}
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          清空
        </button>
        <button
          onClick={() => setOnlyEnabled(v => !v)}
          className={`text-xs px-2.5 py-1 rounded-lg border ${
            onlyEnabled
              ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          仅看已启用
        </button>
        <button
          onClick={() => setLocked(v => !v)}
          className={`ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border ${
            locked
              ? 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
          }`}
          title="锁定后不允许随意调整，需先解锁"
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          {locked ? '已锁定' : '未锁定'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">无法加载技能库</p>
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
      ) : !error && skills.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{search ? '没有匹配的技能' : '技能库为空'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([cat, items]) => {
            const allOn = items.every(s => selected.has(s.id));
            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => toggleCategory(items)}
                    disabled={locked}
                    className="flex items-center gap-1 disabled:opacity-40"
                    title="整类启用/停用"
                  >
                    {allOn ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    )}
                  </button>
                  <Folder className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{cat}</h2>
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map(skill => {
                    const on = selected.has(skill.id);
                    return (
                      <div
                        key={skill.id}
                        className={`bg-white dark:bg-gray-800 border rounded-xl overflow-hidden ${
                          on ? 'border-emerald-300 dark:border-emerald-700' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={locked}
                            onChange={() => toggle(skill.id)}
                            className="w-4 h-4 accent-emerald-500 flex-shrink-0"
                          />
                          <button
                            onClick={() => setExpanded(expanded === String(skill.id) ? null : String(skill.id))}
                            className="flex-1 text-left"
                          >
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
                              {skill.title || `技能 #${skill.id}`}
                            </span>
                          </button>
                          <svg
                            onClick={() => setExpanded(expanded === String(skill.id) ? null : String(skill.id))}
                            className={`w-4 h-4 text-gray-400 ml-2 flex-shrink-0 transition-transform cursor-pointer ${
                              expanded === String(skill.id) ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {expanded === String(skill.id) && (
                          <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                            {skill.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{skill.description}</p>
                            )}
                            {skill.trigger && (
                              <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">触发: </span>
                                <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                  {skill.trigger}
                                </code>
                              </div>
                            )}
                            {skill.steps && (
                              <div className="mt-2 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">步骤: </span>
                                <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                  {skill.steps}
                                </code>
                              </div>
                            )}
                            {skill.category && (
                              <div className="mt-1 text-xs text-gray-400">分类：{skill.category}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
