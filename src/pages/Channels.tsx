import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Check, ExternalLink, Code, Bot, Globe, MessageSquare, Smartphone } from 'lucide-react';

export function APIKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState('');

  const getKey = () => localStorage.getItem('luoduo_api_key') || '';

  const load = () => {
    fetch(`https://tyb.ap100168.com/api/keys/list?api_key=${getKey()}`)
      .then(r => r.json()).then(d => setKeys(d.data || [])).catch(() => {});
  };
  useEffect(load, []);

  const generate = async () => {
    const r = await fetch(`https://tyb.ap100168.com/api/keys/generate?api_key=${getKey()}`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name: newName || '新应用', permissions: ['chat','tools']})
    });
    const d = await r.json();
    if (d.data?.key) {
      setNewKey(d.data.key);
      setNewName('');
      load();
    }
  };

  const revoke = async (key: string) => {
    await fetch(`https://tyb.ap100168.com/api/keys/revoke?api_key=${getKey()}`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({key})
    });
    load();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">API 密钥管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理第三方应用访问密钥</p>
        </div>
      </div>

      {newKey && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">🎉 新密钥已生成（请立即复制，不会再次显示）</p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-700 rounded-lg text-xs font-mono break-all">{newKey}</code>
            <button onClick={() => { navigator.clipboard.writeText(newKey); setCopied('new'); }}
              className="px-3 py-2 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600">
              {copied === 'new' ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="应用名称（如：我的博客）" />
        <button onClick={generate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-sm font-medium shadow-lg">
          <Plus className="w-4 h-4" /> 生成密钥
        </button>
      </div>

      <div className="space-y-2">
        {keys.map((k: any) => (
          <div key={k.key} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{k.name}</span>
              <div className="flex gap-1">
                <button onClick={() => { navigator.clipboard.writeText(k.key); setCopied(k.key); }}
                  className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                  {copied === k.key ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={() => revoke(k.key)}
                  className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <code className="block text-xs text-gray-500 font-mono truncate">{k.key}</code>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-gray-400">权限: {(k.permissions || []).join(', ')}</span>
              <span className="text-[10px] text-gray-400">| 创建: {k.created_at?.slice(0, 10)}</span>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Key className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs">还没有 API 密钥</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PublishChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [embedCode, setEmbedCode] = useState('');

  useEffect(() => {
    const key = localStorage.getItem('luoduo_api_key') || '';
    fetch(`https://tyb.ap100168.com/api/publish/channels?api_key=${key}`)
      .then(r => r.json()).then(d => setChannels(d.data || [])).catch(() => {});
    fetch(`https://tyb.ap100168.com/api/publish/embed?api_key=${key}`)
      .then(r => r.json()).then(d => setEmbedCode(d.data?.html || '')).catch(() => {});
  }, []);

  const icons: Record<string, any> = {
    iframe: Code, rest: Globe, webhook: MessageSquare
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">发布渠道</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">将 AI 军团能力嵌入到你的产品中</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {channels.map(ch => {
          const Icon = icons[ch.type] || Globe;
          return (
            <div key={ch.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{ch.name}</h3>
                  <span className="text-[10px] text-gray-400 uppercase">{ch.type}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{ch.description}</p>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <pre className="text-[10px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">{ch.setup_guide}</pre>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">🌐 Web 嵌入代码</h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-3">
          <code className="text-xs text-gray-600 dark:text-gray-400 break-all">{embedCode}</code>
        </div>
        <button onClick={() => navigator.clipboard.writeText(embedCode)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl text-sm font-medium">
          <Copy className="w-4 h-4" /> 复制嵌入代码
        </button>
      </div>
    </div>
  );
}
