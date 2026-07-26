import { useState, useEffect } from 'react';
import { Puzzle, Search, Check, X, Plus, Settings2, ExternalLink, Download, Star, ToggleLeft, ToggleRight } from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string;
  tags: string[];
  enabled: number;
  installed_at: string;
}

const tagColors: Record<string, string> = {
  '搜索': 'bg-gray-100 text-gray-700', '信息': 'bg-gray-100 text-gray-700',
  '开发': 'bg-gray-100 text-gray-700', '工具': 'bg-gray-100 text-gray-700',
  '图像': 'bg-gray-100 text-gray-700', '创作': 'bg-gray-100 text-gray-700',
  '音频': 'bg-gray-100 text-gray-700', '集成': 'bg-gray-100 text-gray-700',
  '通知': 'bg-gray-100 text-gray-700', '网络': 'bg-gray-100 text-gray-700',
  '自动化': 'bg-gray-100 text-gray-700', '工作流': 'bg-gray-100 text-gray-700',
  '测试': 'bg-gray-100 text-gray-700',
};

export default function PluginMarket() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [search, setSearch] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const [manifest, setManifest] = useState('{\n  "name": "",\n  "description": "",\n  "version": "1.0.0",\n  "author": "",\n  "icon": "🔌",\n  "tags": []\n}');

  const getKey = () => localStorage.getItem('luoduo_api_key') || '';

  const load = () => {
    const key = getKey();
    fetch(`https://tyb.ap100168.com/api/plugins/list?api_key=${key}`)
      .then(r => r.json()).then(d => setPlugins(d.data || [])).catch(() => {});
  };

  useEffect(load, []);

  const togglePlugin = async (id: string, enabled: number) => {
    const key = getKey();
    await fetch(`https://tyb.ap100168.com/api/plugins/toggle?api_key=${key}`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({id, enabled: !enabled})
    });
    load();
  };

  const installPlugin = async () => {
    const key = getKey();
    try {
      const m = JSON.parse(manifest);
      await fetch(`https://tyb.ap100168.com/api/plugins/register?api_key=${key}`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(m)
      });
      setShowInstall(false);
      load();
    } catch (e: any) { alert('JSON 格式错误: ' + e.message); }
  };

  const filtered = plugins.filter(p =>
    p.name.includes(search) || p.description.includes(search) || p.tags.some(t => t.includes(search))
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-500 flex items-center justify-center">
          <Puzzle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">插件市场</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{plugins.length} 个插件 · 支持第三方开发者接入</p>
        </div>
        <button onClick={() => setShowInstall(!showInstall)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-500 text-white rounded-xl text-sm font-medium shadow-lg">
          <Plus className="w-4 h-4" /> 注册插件
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="搜索插件..." />
        </div>
      </div>

      {showInstall && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <h3 className="text-sm font-semibold mb-3">📦 注册新插件</h3>
          <textarea value={manifest} onChange={e => setManifest(e.target.value)}
            rows={8} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-mono bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowInstall(false)} className="px-3 py-1.5 text-sm text-gray-500">取消</button>
            <button onClick={installPlugin} className="px-4 py-1.5 text-sm bg-gradient-to-r from-gray-500 to-gray-500 text-white rounded-lg font-medium">注册</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{p.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</h3>
                  <span className="text-[10px] text-gray-400">v{p.version}</span>
                  {p.author === 'AI军团' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">官方</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(p.tags || []).map(t => (
                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full ${tagColors[t] || 'bg-gray-100 text-gray-600'}`}>{t}</span>
                  ))}
                  <span className="text-[10px] text-gray-400">by {p.author}</span>
                </div>
              </div>
              <button onClick={() => togglePlugin(p.id, p.enabled)}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${p.enabled ? 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/30' : 'text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {p.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Puzzle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">没有找到匹配的插件</p>
        </div>
      )}
    </div>
  );
}
