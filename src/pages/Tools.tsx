import { useState, useEffect } from 'react';
import { Wrench, Play, Search, Globe, FileText, Send, Code, Image, ScanText, Volume2, Mic, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  parameters: any;
}

const toolIcons: Record<string, any> = {
  code_execute: Code,
  web_search: Search,
  http_request: Globe,
  document_read: FileText,
  webhook_send: Send,
  web_fetch: Globe,
  image_generate: Image,
  ocr: ScanText,
  tts: Volume2,
  asr: Mic,
};

const toolLabels: Record<string, string> = {
  code_execute: '代码执行沙箱',
  web_search: '联网搜索',
  http_request: 'HTTP 请求器',
  document_read: '文档读取器',
  webhook_send: '消息推送',
  web_fetch: '网页抓取',
  image_generate: 'AI 绘画',
  ocr: '文字识别 OCR',
  tts: '语音合成',
  asr: '语音识别',
};

const toolColors: Record<string, string> = {
  code_execute: 'from-gray-500 to-gray-600',
  web_search: 'from-gray-500 to-gray-600',
  http_request: 'from-gray-500 to-gray-600',
  document_read: 'from-gray-500 to-gray-600',
  webhook_send: 'from-gray-500 to-gray-600',
  web_fetch: 'from-gray-500 to-gray-600',
  image_generate: 'from-gray-500 to-gray-600',
  ocr: 'from-gray-500 to-gray-600',
  tts: 'from-gray-500 to-gray-600',
  asr: 'from-gray-500 to-gray-600',
};

const defaultParams: Record<string, any> = {
  code_execute: { language: 'python', code: '# 在这里写 Python 代码\nprint("Hello, AI军团!")' },
  web_search: { query: '', count: 5 },
  http_request: { url: '', method: 'GET', headers: {}, body: {} },
  document_read: { source: '', source_type: 'url', file_type: 'auto', max_length: 8000 },
  webhook_send: { url: '', message: '', title: 'AI军团消息', platform: 'auto', msg_type: 'markdown' },
  web_fetch: { url: '', max_length: 5000 },
  image_generate: { prompt: '', style: 'auto', size: '1024x1024', count: 1 },
  ocr: { image_url: '', language: 'auto' },
  tts: { text: '', voice: 'female', speed: 1.0 },
  asr: { audio_url: '', language: 'auto' },
};

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState('');

  const getApiKey = () => localStorage.getItem('luoduo_api_key') || '';

  useEffect(() => {
    const key = getApiKey();
    if (!key) { setError('请在设置中配置 API Key'); setLoadingList(false); return; }
    setLoadingList(true);
    fetch(`https://tyb.ap100168.com/api/tools/list?api_key=${key}`)
      .then(r => r.json())
      .then(d => { setTools(d.data || []); setError(''); setLoadingList(false); })
      .catch(e => { setError('加载工具列表失败: ' + e.message); setLoadingList(false); });
  }, []);

  const selectTool = (name: string) => {
    setSelected(name);
    setParams(defaultParams[name] || {});
    setResult(null);
    setError('');
  };

  const updateParam = (key: string, value: any) => {
    setParams((prev: any) => ({ ...prev, [key]: value }));
  };

  const execute = async () => {
    const key = getApiKey();
    if (!key) { setError('请配置 API Key'); return; }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const r = await fetch(`https://tyb.ap100168.com/api/tools/execute?api_key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected, params })
      });
      const d = await r.json();
      setResult(d.data || d);
    } catch (e: any) {
      setError('执行失败: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">工具箱</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">6 个可执行工具 · 代码沙箱 · 联网搜索 · API 请求 · 文档读取 · Webhook</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
          {error}
        </div>
      )}

      {/* 加载中 */}
      {loadingList && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-400">加载工具列表...</span>
        </div>
      )}

      {/* 空状态 */}
      {!loadingList && !error && tools.length === 0 && (
        <div className="text-center py-16">
          <Wrench className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">暂无可用工具</p>
          <p className="text-gray-400 text-xs mt-1">请检查后端服务是否正常运行</p>
        </div>
      )}

      {!loadingList && tools.length > 0 && <div className="flex gap-6">
        {/* Left: Tool List */}
        <div className="w-56 flex-shrink-0 space-y-2">
          {tools.map(t => {
            const Icon = toolIcons[t.name] || Wrench;
            const colors = toolColors[t.name] || 'from-gray-500 to-gray-600';
            return (
              <button
                key={t.name}
                onClick={() => selectTool(t.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  selected === t.name
                    ? 'bg-gradient-to-r ' + colors + ' text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{toolLabels[t.name] || t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Tool Panel */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                {toolLabels[selected] || selected}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {tools.find(t => t.name === selected)?.description}
              </p>

              {/* Params */}
              <div className="space-y-3 mb-4">
                {selected === 'code_execute' && (
                  <>
                    <select value={params.language} onChange={e => updateParam('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="shell">Shell</option>
                    </select>
                    <textarea value={params.code} onChange={e => updateParam('code', e.target.value)}
                      rows={8} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-mono bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                      placeholder="输入代码..." />
                  </>
                )}
                {selected === 'web_search' && (
                  <div className="flex gap-2">
                    <input value={params.query} onChange={e => updateParam('query', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      placeholder="输入搜索关键词..." />
                    <select value={params.count} onChange={e => updateParam('count', parseInt(e.target.value))}
                      className="w-20 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      {[3,5,10].map(n => <option key={n} value={n}>{n}条</option>)}
                    </select>
                  </div>
                )}
                {(selected === 'http_request' || selected === 'web_fetch') && (
                  <div className="flex gap-2">
                    {selected === 'http_request' && (
                      <select value={params.method} onChange={e => updateParam('method', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                        <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                      </select>
                    )}
                    <input value={params.url} onChange={e => updateParam('url', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      placeholder="输入 URL..." />
                  </div>
                )}
                {(selected === 'document_read') && (
                  <>
                    <input value={params.source} onChange={e => updateParam('source', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      placeholder="输入文档 URL..." />
                    <select value={params.file_type} onChange={e => updateParam('file_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      <option value="auto">自动检测</option>
                      <option value="pdf">PDF</option>
                      <option value="html">HTML</option>
                      <option value="csv">CSV</option>
                      <option value="txt">TXT</option>
                    </select>
                  </>
                )}
                {selected === 'webhook_send' && (
                  <>
                    <input value={params.url} onChange={e => updateParam('url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      placeholder="Webhook URL..." />
                    <input value={params.title} onChange={e => updateParam('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      placeholder="消息标题" />
                    <textarea value={params.message} onChange={e => updateParam('message', e.target.value)}
                      rows={4} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                      placeholder="消息内容..." />
                  </>
                )}
              </div>

              {/* Execute Button */}
              <button onClick={execute} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl text-sm font-medium hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 transition-all shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? '执行中...' : '执行'}
              </button>

              {/* Result */}
              {result && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {result.ok ? (
                      <CheckCircle className="w-4 h-4 text-gray-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-500" />
                    )}
                    <span className={`text-xs font-medium ${result.ok ? 'text-gray-600' : 'text-gray-600'}`}>
                      {result.ok ? '执行成功' : '执行失败'}
                    </span>
                    {result._elapsed && (
                      <span className="text-xs text-gray-400">{result._elapsed}s</span>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-80 overflow-auto">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
              <Wrench className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">选择一个工具开始使用</p>
              <p className="text-gray-400 text-xs mt-1">左侧列出了所有可执行工具</p>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
