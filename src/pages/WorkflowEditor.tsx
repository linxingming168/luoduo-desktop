import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, Handle, Position,
  type Node, type Edge, type NodeProps, type Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Save, Trash2, Plus, Settings2, Pause, Clock, Wrench, Code2, Bot, GitBranch, Repeat, Variable, MessageSquare, Loader2 } from 'lucide-react';

interface NodeData {
  [key: string]: any;
  type: string;
  label: string;
  prompt?: string;
  model?: string;
  output_variable?: string;
  language?: string;
  code?: string;
  tool_name?: string;
  params?: any;
  search_query?: string;
  expression?: string;
  iterator?: string;
  variable?: string;
  operation?: string;
  variable_name?: string;
  value?: string;
  agent_id?: string;
  task?: string;
  seconds?: number;
  title?: string;
  message?: string;
}

const nodeTypeConfigs: Record<string, { label: string; color: string; icon: any; category: string; defaults: NodeData }> = {
  start: { label: '开始', color: '#22c55e', icon: Play, category: '控制', defaults: { type: 'start', label: '' } },
  end: { label: '结束', color: '#ef4444', icon: Pause, category: '控制', defaults: { type: 'end', label: '' } },
  llm: { label: 'LLM 调用', color: '#3b82f6', icon: Bot, category: 'AI', defaults: { type: 'llm', label: '', prompt: '', model: 'qwen-plus', output_variable: '' } },
  code: { label: '代码执行', color: '#10b981', icon: Code2, category: '处理', defaults: { type: 'code', label: '', language: 'python', code: '', output_variable: '' } },
  tool: { label: '工具调用', color: '#8b5cf6', icon: Wrench, category: '集成', defaults: { type: 'tool', label: '', tool_name: 'web_search', params: {}, output_variable: '' } },
  condition: { label: '条件判断', color: '#f59e0b', icon: GitBranch, category: '控制', defaults: { type: 'condition', label: '', expression: '' } },
  loop: { label: '循环', color: '#ec4899', icon: Repeat, category: '控制', defaults: { type: 'loop', label: '', iterator: 'items', variable: 'item' } },
  variable: { label: '变量操作', color: '#6366f1', icon: Variable, category: '数据', defaults: { type: 'variable', label: '', operation: 'set', variable_name: '', value: '' } },
  agent: { label: '智能体调度', color: '#14b8a6', icon: Bot, category: 'AI', defaults: { type: 'agent', label: '', agent_id: 'bixin', task: '', output_variable: '' } },
  delay: { label: '延迟等待', color: '#a855f7', icon: Clock, category: '控制', defaults: { type: 'delay', label: '', seconds: 5 } },
  message: { label: '消息通知', color: '#f97316', icon: MessageSquare, category: '输出', defaults: { type: 'message', label: '', message: '', title: '工作流通知' } },
};

function WorkflowNodeComponent({ data, selected }: NodeProps<any>) {
  const cfg = nodeTypeConfigs[data.type] || { label: data.type, color: '#6b7280', icon: Bot };
  const Icon = cfg.icon;
  return (
    <div className={`relative px-4 py-3 rounded-xl border-2 min-w-[160px] transition-shadow ${selected ? 'shadow-lg ring-2 ring-blue-400' : 'shadow-sm'}`}
      style={{ borderColor: cfg.color, background: `${cfg.color}11` }}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2 !border-white" style={{ background: cfg.color }} />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cfg.color }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{cfg.label}</div>
          {data.label && <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{data.label}</div>}
        </div>
      </div>
      {data.type === 'condition' ? (
        <>
          <Handle type="source" position={Position.Right} id="true" className="!w-3 !h-3 !border-2 !border-white !-right-4" style={{ background: '#22c55e', top: '40%' }} />
          <Handle type="source" position={Position.Right} id="false" className="!w-3 !h-3 !border-2 !border-white !-right-4" style={{ background: '#ef4444', top: '70%' }} />
        </>
      ) : data.type !== 'end' ? (
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2 !border-white" style={{ background: cfg.color }} />
      ) : null}
    </div>
  );
}

const nodeTypes: any = {
  start: WorkflowNodeComponent, end: WorkflowNodeComponent,
  llm: WorkflowNodeComponent, code: WorkflowNodeComponent,
  tool: WorkflowNodeComponent, condition: WorkflowNodeComponent,
  loop: WorkflowNodeComponent, variable: WorkflowNodeComponent,
  agent: WorkflowNodeComponent, delay: WorkflowNodeComponent,
  message: WorkflowNodeComponent,
};

function ConfigPanel({ node, onUpdate, onDelete }: { node: any; onUpdate: (d: NodeData) => void; onDelete: () => void }) {
  const cfg = nodeTypeConfigs[node.data?.type || ''];
  if (!cfg) return null;
  const data = node.data || {} as NodeData;
  const upd = (k: string, v: any) => onUpdate({ ...data, [k]: v });

  const input = (key: string, placeholder = '', cls = '') => (
    <input value={(data as any)[key] || ''} onChange={e => upd(key, e.target.value)}
      className={`w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${cls}`} placeholder={placeholder} />
  );
  const textarea = (key: string, rows = 3, placeholder = '') => (
    <textarea value={(data as any)[key] || ''} onChange={e => upd(key, e.target.value)}
      rows={rows} className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-mono bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none" placeholder={placeholder} />
  );
  const select = (key: string, options: [string, string][]) => (
    <select value={(data as any)[key] || ''} onChange={e => upd(key, e.target.value)}
      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{cfg.label} 配置</h3>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">节点标签</label>{input('label', '可选标识')}</div>

      {data.type === 'llm' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">Prompt 模板（用 {'{'}变量{'}'} 引用）</label>{textarea('prompt', 4)}</div>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">模型</label>{select('model', [['qwen-plus','通义千问Plus'],['deepseek-v4-pro','DeepSeek']])}</div>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">输出变量名</label>{input('output_variable', '_llm_result')}</div>
      </>)}
      {data.type === 'code' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">语言</label>{select('language', [['python','Python'],['javascript','JavaScript']])}</div>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">代码</label>{textarea('code', 5)}</div>
      </>)}
      {data.type === 'tool' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">工具</label>{select('tool_name', [['web_search','联网搜索'],['http_request','HTTP请求'],['web_fetch','网页抓取'],['code_execute','代码执行']])}</div>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">参数（用 {'{'}变量{'}'} 引用）</label>{input('search_query', '搜索关键词')}</div>
      </>)}
      {data.type === 'condition' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">条件表达式</label>{textarea('expression', 2)}
        <div className="flex gap-2 mt-1">
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700">✅ 是 → 上端口</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700">❌ 否 → 下端口</span>
        </div></div>
      </>)}
      {data.type === 'agent' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">智能体 ID</label>{input('agent_id', 'bixin / CodeAgent / ...')}</div>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">任务描述</label>{textarea('task', 3)}</div>
      </>)}
      {data.type === 'delay' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">延迟秒数</label>
          <input type="number" value={data.seconds || 5} onChange={e => upd('seconds', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
        </div>
      </>)}
      {data.type === 'variable' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">操作</label>{select('operation', [['set','设置'],['append','追加'],['increment','自增']])}</div>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">变量名</label>{input('variable_name', 'my_var')}</div>
        {data.operation !== 'increment' && <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">值</label>{input('value', '')}</div>}
      </>)}
      {data.type === 'message' && (<>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">标题</label>{input('title', '工作流通知')}</div>
        <div className="mb-2"><label className="block text-xs text-gray-500 mb-1">消息内容</label>{textarea('message', 3)}</div>
      </>)}
      <p className="text-[10px] text-gray-400 mt-2">用 <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{'}变量名{'}'}</code> 引用上游输出</p>
    </div>
  );
}

let nodeCounter = 0;
const defaultEdgeOptions = { animated: true };

export default function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [wfName, setWfName] = useState('未命名工作流');
  const [wfDesc, setWfDesc] = useState('');
  const [saved, setSaved] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [rfInstance, setRfInstance] = useState<any>(null);

  const getKey = () => localStorage.getItem('luoduo_api_key') || '';

  useEffect(() => {
    const key = getKey();
    fetch(`https://tyb.ap100168.com/api/workflow/list?api_key=${key}`)
      .then(r => r.json()).then(d => {
        const list = d.data || [];
        if (list.length > 0) loadWf(list[0]);
      }).catch(() => {});
  }, []);

  const loadWf = (wf: any) => {
    setWfName(wf.name); setWfDesc(wf.description || '');
    const n = (wf.nodes || []).map((n: any) => ({
      id: n.id, type: n.type, position: n.position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { ...(n.config || {}), label: n.label || '', type: n.type } as NodeData,
    }));
    const e = (wf.edges || []).map((e: any) => ({
      id: e.id, source: e.source, target: e.target, sourceHandle: e.source_handle || null,
      label: e.label || '', style: e.source_handle === 'false' ? { stroke: '#ef4444' } : e.source_handle === 'true' ? { stroke: '#22c55e' } : {},
    }));
    setNodes(n); setEdges(e); setSaved(true);
    nodeCounter = n.length;
  };

  const onConnect = useCallback((conn: Connection) => {
    const eid = `e_${Date.now()}`;
    setEdges(eds => addEdge({ ...conn, id: eid, style: conn.sourceHandle === 'false' ? { stroke: '#ef4444' } : conn.sourceHandle === 'true' ? { stroke: '#22c55e' } : {} }, eds));
    setSaved(false);
  }, [setEdges]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type || !rfInstance) return;
    const pos = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    nodeCounter++;
    const cfg = nodeTypeConfigs[type];
    setNodes(nds => [...nds, { id: `${type}_${nodeCounter}`, type, position: pos, data: { ...cfg.defaults } }]);
    setSaved(false);
  }, [rfInstance, setNodes]);

  const onNodeClick = useCallback((_: any, n: Node) => setSelectedNode(n as Node<NodeData>), []);

  const updateData = useCallback((data: NodeData) => {
    if (!selectedNode) return;
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data } : n));
    setSelectedNode((prev: any) => prev ? { ...prev, data } : null);
    setSaved(false);
  }, [selectedNode, setNodes]);

  const deleteNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null); setSaved(false);
  }, [selectedNode, setNodes, setEdges]);

  const save = async () => {
    const key = getKey(); if (!key) return;
    const payload = {
      id: `wf_${Date.now().toString(36)}`, name: wfName, description: wfDesc,
      nodes: nodes.map(n => ({
        id: n.id, type: n.type, label: n.data?.label || '',
        config: { ...n.data, type: undefined, label: undefined }, position: n.position,
      })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, source_handle: e.sourceHandle || '', label: e.label || '' })),
    };
    try {
      const r = await fetch(`https://tyb.ap100168.com/api/workflow/create?api_key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.code === 0) setSaved(true);
    } catch (err) { console.error(err); }
  };

  const execute = async () => {
    const key = getKey(); if (!key) return;
    setExecuting(true); setExecResult(null);
    await save();
    try {
      const r = await fetch(`https://tyb.ap100168.com/api/workflow/list?api_key=${key}`);
      const list = (await r.json()).data || [];
      if (list.length > 0) {
        const wf = list[list.length - 1];
        const er = await fetch(`https://tyb.ap100168.com/api/workflow/execute?api_key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: wf.id }),
        });
        const ed = await er.json();
        setExecResult(ed.data || ed);
        const executedIds = new Set(Object.keys(ed.data?.node_results || {}));
        setNodes(nds => nds.map(n => ({ ...n, className: executedIds.has(n.id) ? '!ring-2 !ring-green-400' : '' })));
      }
    } catch (err: any) { setExecResult({ error: err.message }); }
    setExecuting(false);
  };

  const paletteItems = useMemo(() => {
    const cats = ['控制', 'AI', '处理', '集成', '数据', '输出'];
    const items: Record<string, any[]> = {};
    for (const [type, cfg] of Object.entries(nodeTypeConfigs)) {
      if (!items[cfg.category]) items[cfg.category] = [];
      items[cfg.category].push({ type, ...cfg });
    }
    return cats.map(c => ({ category: c, items: items[c] || [] }));
  }, []);

  return (
    <div className="h-full flex">
      <div className="w-12 flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-2 gap-2">
        <button onClick={() => setShowPalette(!showPalette)}
          className={`p-2 rounded-lg ${showPalette ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="节点">
          <Plus className="w-5 h-5" />
        </button>
        <button onClick={save} className={`p-2 rounded-lg ${!saved ? 'text-amber-500' : 'text-gray-500'} hover:bg-gray-200 dark:hover:bg-gray-700`} title="保存">
          <Save className="w-5 h-5" />
        </button>
        <button onClick={execute} disabled={executing}
          className="p-2 rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50" title="执行">
          {executing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
        </button>
        <div className="flex-1" />
        <button onClick={() => { setNodes([]); setEdges([]); }} className="p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" title="清空">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {showPalette && (
        <div className="w-48 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-3 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">节点</h3>
          {paletteItems.map(({ category, items }) => (
            <div key={category} className="mb-3">
              <div className="text-[10px] text-gray-400 uppercase mb-1.5">{category}</div>
              {items.map((item: any) => (
                <div key={item.type} draggable
                  onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', item.type); e.dataTransfer.effectAllowed = 'move'; }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing mb-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: item.color }}>
                    <item.icon className="w-3 h-3 text-white" />
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <input value={wfName} onChange={e => { setWfName(e.target.value); setSaved(false); }}
            className="text-sm font-bold bg-transparent text-gray-900 dark:text-gray-100 border-none outline-none flex-1" placeholder="工作流名称" />
          <input value={wfDesc} onChange={e => { setWfDesc(e.target.value); setSaved(false); }}
            className="text-xs text-gray-500 bg-transparent border-none outline-none flex-1 max-w-xs" placeholder="描述" />
          {!saved && <span className="text-[10px] text-amber-500">未保存</span>}
        </div>
        <div className="flex-1">
          <ReactFlow<any>
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onInit={setRfInstance}
            onDragOver={onDragOver} onDrop={onDrop}
            onNodeClick={onNodeClick} onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes} fitView
            deleteKeyCode="Delete" defaultEdgeOptions={defaultEdgeOptions}
          >
            <Background /> <Controls /> <MiniMap />
          </ReactFlow>
        </div>
      </div>

      <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-3 bg-white dark:bg-gray-800">
        {selectedNode ? (
          <ConfigPanel node={selectedNode} onUpdate={updateData} onDelete={deleteNode} />
        ) : execResult ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">执行结果</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 max-h-64 overflow-auto">
              <pre className="text-[10px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {JSON.stringify(execResult, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <Settings2 className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs">点击节点编辑配置</p>
          </div>
        )}
      </div>
    </div>
  );
}
