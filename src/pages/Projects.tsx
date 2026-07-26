import { useState, useEffect } from 'react';
import { api, getServerUrl } from '../api/client';
import type { Agent } from '../api/types';
import { FolderOpen, Plus, Send, CheckCircle, AlertCircle, Bot, Target, ChevronRight, Heart, Sparkles, Trash2 } from 'lucide-react';

/* ---------- 类型定义 ---------- */
interface Project {
  id: string; name: string; type: string; description: string;
  createdAt: string; status: '进行中' | '已完成' | '待启动';
  tasks: ProjectTask[];
}
interface ProjectTask {
  id: string; instruction: string; assignedAgents: string[];
  result?: string; createdAt: string; status: '待处理' | '执行中' | '已完成';
}

const PROJECT_TYPES = ['零售开店', '市场调研', '系统运维', '财务预算', '产品设计', '法律合规', '康养人休', '其他'];

/* Agent 能力关键词映射（智能匹配用） */
const AGENT_KEYWORDS: Record<string, string[]> = {
  RetailAgent: ['零售', '门店', '商品', 'sku', '货架', '补货', '销售', '收银', '便利店'],
  RobotAgent: ['机器人', '具身', '巡检', '补货', '移动', 'ros2', '机械臂', '导航'],
  SupplyAgent: ['供应链', '采购', '物流', '库存', '仓库', '配送', '进货'],
  MarketingAgent: ['市场', '营销', '推广', '品牌', '广告', '用户增长', '渠道'],
  FinanceAgent: ['财务', '预算', '成本', '利润', '营收', '支出', '报表', '核算'],
  LegalAgent: ['法务', '合同', '合规', '法规', '知识产权', '风险', '条款'],
  CloudOpsAgent: ['服务器', '运维', '部署', '云', 'nginx', 'docker', 'k8s', '网络'],
  SafetyAgent: ['安全', '风控', '防护', '漏洞', '权限', '加密', '审计'],
  CodeAgent: ['代码', '开发', '编程', 'python', '前端', '后端', '接口', '脚本'],
  HealthAgent: ['健康', '康养', '老人', '护理', '康复'],
  BioMedAgent: ['医疗', '生物', '检测', '监测', '体征'],
  BodyScienceAgent: ['人体', '工学', '人体工学', '姿势', '步态', '交互', '贴合度'],
  MechanicalAgent: ['机械', '结构', '设计', 'cad', '3d', '受力'],
  DataAgent: ['数据', '分析', '报表', '统计', '可视化', '图表'],
  CommunityAgent: ['社区', '论坛', '用户', '社群', '运营'],
  TrainingAgent: ['培训', '训练', '模型', '知识', '课程'],
  ProjectAgent: ['项目', '立项', '申报', '计划', '方案'],
  MaintenanceAgent: ['设备', '维修', '保养', '故障', '巡检'],
  OfficeAgent: ['文档', '办公', '表格', '报告', 'ppt', '方案书'],
  MathAgent: ['数学', '计算', '算数', '统计', '概率'],
  LuodaiAgent: ['秘书', '记录', '归档', '版本', '日志', '指引'],
  DiskGuardAgent: ['磁盘', '硬盘', '清理', '备份', '巡检'],
  MeiyijiaOpsAgent: ['美宜佳', 'saas', '中台', '运维', '后台'],
};

const AGENT_LABELS: Record<string, string> = {};

/* ---------- 本地存储 ---------- */
function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem('luoduo_projects') || '[]'); } catch { return []; }
}
function saveProjects(projects: Project[]) {
  localStorage.setItem('luoduo_projects', JSON.stringify(projects));
}
function loadPreferences(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('luoduo_preferences') || '{}'); } catch { return {}; }
}
function savePreferences(p: Record<string, string>) {
  localStorage.setItem('luoduo_preferences', JSON.stringify(p));
}

let _agentsCache: Agent[] = [];
function getAgentLabel(id: string): string {
  const a = _agentsCache.find(a => a.id === id);
  return a?.label || id;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [page, setPage] = useState<'list' | 'new' | 'detail'>('list');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [prefs, setPrefs] = useState<Record<string, string>>({});

  // 新建项目表单
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('零售开店');
  const [newDesc, setNewDesc] = useState('');

  // 任务输入
  const [taskInput, setTaskInput] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);
  const [suggestedAgents, setSuggestedAgents] = useState<string[]>([]);
  const [projectTab, setProjectTab] = useState<'动态' | '计划' | '任务' | '资产'>('任务');

  useEffect(() => {
    setProjects(loadProjects());
    setPrefs(loadPreferences());
    api.getAgents().then(r => {
      const list = r.agents || [];
      setAgents(list);
      _agentsCache = list;
      for (const a of list) AGENT_LABELS[a.id] = a.label || a.id;
    }).catch(() => {});
  }, []);

  /* ---------- 项目管理 ---------- */
  const createProject = () => {
    if (!newName.trim()) return;
    const p: Project = {
      id: Date.now().toString(36),
      name: newName.trim(), type: newType, description: newDesc.trim(),
      createdAt: new Date().toLocaleString(), status: '待启动',
      tasks: [],
    };
    const updated = [...projects, p];
    setProjects(updated); saveProjects(updated);
    setNewName(''); setNewDesc(''); setPage('list');
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated); saveProjects(updated);
    if (currentProject?.id === id) setPage('list');
  };

  /* ---------- 智能匹配 ---------- */
  const analyzeTask = (text: string) => {
    const lower = text.toLowerCase();
    // 计算每个 Agent 的匹配分数
    const scores: { id: string; score: number }[] = [];
    for (const [id, keywords] of Object.entries(AGENT_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score += kw.length;
      }
      if (score > 0 || id === 'CodeAgent') { // 小保底
        scores.push({ id, score });
      }
    }
    // 按分数排序，取前5个
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 5).map(s => s.id);
    // 如果没匹配到，放几个万能Agent
    if (top.length === 0) top.push('CodeAgent', 'OfficeAgent');
    setSuggestedAgents(top);
    return top;
  };

  /* ---------- 执行任务 ---------- */
  const dispatchTask = async (projectId: string) => {
    if (!taskInput.trim()) return;
    const ags = suggestedAgents.length > 0 ? suggestedAgents : ['CodeAgent'];
    const task: ProjectTask = {
      id: Date.now().toString(36),
      instruction: taskInput.trim(),
      assignedAgents: ags,
      createdAt: new Date().toLocaleString(),
      status: '执行中',
    };

    // 先保存任务
    const updated = projects.map(p => {
      if (p.id === projectId) {
        p.status = '进行中';
        p.tasks = [task, ...p.tasks];
      }
      return p;
    });
    setProjects(updated); saveProjects(updated);
    setTaskLoading(true);

    // 执行：先尝试智能分派，再保底单Agent
    try {
      const res = await fetch(`${getServerUrl()}/api/skydo/run_mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: task.instruction }),
      });
      const data = await res.json();
      const reply = data.reply || JSON.stringify(data.results_summary || data);
      // 更新任务结果
      const updated2 = loadProjects().map(p => {
        if (p.id === projectId) {
          p.tasks = p.tasks.map(t =>
            t.id === task.id ? { ...t, status: '已完成' as const, result: reply } : t
          );
        }
        return p;
      });
      setProjects(updated2); saveProjects(updated2);
      setCurrentProject(updated2.find(p => p.id === projectId) || null);
    } catch (err: any) {
      const updated2 = loadProjects().map(p => {
        if (p.id === projectId) {
          p.tasks = p.tasks.map(t =>
            t.id === task.id ? { ...t, status: '已完成' as const, result: `执行异常: ${err.message}` } : t
          );
        }
        return p;
      });
      setProjects(updated2); saveProjects(updated2);
    }
    setTaskLoading(false);
    setTaskInput('');
  };

  /* ---------- 偏好设置 ---------- */
  const setPreference = (key: string, value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated); savePreferences(updated);
  };

  /* ========== 页面渲染 ========== */
  // 项目列表
  if (page === 'list') {
    const typeColors: Record<string, string> = {
      '零售开店': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      '市场调研': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      '系统运维': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      '财务预算': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      '产品设计': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      '法律合规': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      '康养人体': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-gray-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">项目管理</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{projects.length} 个项目</p>
            </div>
          </div>
          <button onClick={() => setPage('new')}
            className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-900 text-white text-sm flex items-center gap-1.5 transition-colors">
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>

        {/* 偏好标签 */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">我的偏好</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['财务喜欢：和珅', '市场喜欢：张骞', '法务喜欢：商鞅'].map(p => {
              const [k, v] = p.split('：');
              return (
                <button key={p}
                  onClick={() => setPreference(k, v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    prefs[k] === v
                      ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300'
                      : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                  }`}
                >{p}</button>
              );
            })}
          </div>
        </div>

        {/* 项目列表 */}
        {projects.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">还没有项目，点右上角新建</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(p => (
              <div key={p.id}
                onClick={() => { setCurrentProject(p); setPage('detail'); }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColors[p.type] || 'bg-gray-100 text-gray-600'}`}>
                      {p.type}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === '进行中' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' :
                      p.status === '已完成' ? 'bg-gray-100 text-gray-500 dark:bg-gray-800' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{p.tasks.length} 个任务</span>
                    <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                      className="p-1 hover:text-gray-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                {p.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-1">{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 新建项目
  if (page === 'new') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Plus className="w-6 h-6 text-gray-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">新建项目</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">项目名称</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="例：大亚湾3家店部署" className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">项目类型</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {PROJECT_TYPES.map(t => (
                <button key={t} onClick={() => setNewType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    newType === t ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">描述</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
              placeholder="项目目标、范围、关键节点..." className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={createProject} disabled={!newName.trim()}
              className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-900 disabled:bg-gray-300 text-white text-sm">创建项目</button>
            <button onClick={() => setPage('list')}
              className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">取消</button>
          </div>
        </div>
      </div>
    );
  }

  // 项目详情页
  if (page === 'detail' && currentProject) {
    const p = currentProject;
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => setPage('list')} className="text-sm text-gray-400 hover:text-gray-600">← 返回</button>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-gray-500" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{p.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/30">{p.type}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{p.description} · {p.tasks.length} 个任务</p>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="flex items-center gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
          {(['动态', '计划', '任务', '资产'] as const).map(tab => (
            <button key={tab} onClick={() => setProjectTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                projectTab === tab
                  ? 'text-gray-600 border-gray-500'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >{tab === '动态' ? '📊' : tab === '计划' ? '📋' : tab === '任务' ? '🎯' : '📦'} {tab}</button>
          ))}
        </div>

        {projectTab === '任务' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：任务输入 + 建议 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">📋 发布新任务</h2>
              <textarea value={taskInput} onChange={e => {
                setTaskInput(e.target.value);
                if (e.target.value.length > 5) analyzeTask(e.target.value);
              }} rows={3} placeholder="描述这个子任务..."
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm resize-none" />
              
              {/* 智能匹配建议 */}
              {suggestedAgents.length > 0 && taskInput.length > 5 && (
                <div className="mt-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">智能推荐:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedAgents.map(id => (
                      <span key={id} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200">
                        {getAgentLabel(id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => dispatchTask(p.id)} disabled={!taskInput.trim() || taskLoading}
                className="mt-3 px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-900 disabled:bg-gray-300 text-white text-sm flex items-center gap-2">
                {taskLoading ? <span className="w-2 h-2 bg-white rounded-full animate-ping" /> : <Send className="w-4 h-4" />}
                {taskLoading ? '执行中...' : '发布任务 · 智能分派'}
              </button>
            </div>

            {/* 任务列表 */}
            <div className="space-y-2">
              {p.tasks.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">还没有任务，在上方发布</div>
              ) : p.tasks.map(t => (
                <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.status === '已完成' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-900/30'
                        }`}>{t.status}</span>
                        <span className="text-xs text-gray-400">{t.createdAt}</span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{t.instruction}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.assignedAgents.map(a => (
                          <span key={a} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {getAgentLabel(a)}
                          </span>
                        ))}
                      </div>
                      {t.result && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-600 dark:text-gray-400 markdown-body whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {t.result.slice(0, 600)}
                        </div>
                      )}
                    </div>
                    {t.status === '已完成' && <CheckCircle className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：Agent 技能清单 */}
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">擅长领域</h2>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {agents.filter(a => a.id !== 'MathAgent').map(a => {
                  const kws = AGENT_KEYWORDS[a.id] || [];
                  return (
                    <div key={a.id} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-gray-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{a.label || a.id}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                          {kws.slice(0, 4).join(' · ') || '通用'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* 其他标签页 */}
        {projectTab !== '任务' && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center text-gray-400">
            {projectTab === '动态' && <><div className="text-3xl mb-3">📊</div><p className="text-sm">项目动态（开发中）</p></>}
            {projectTab === '计划' && <><div className="text-3xl mb-3">📋</div><p className="text-sm">项目计划（开发中）</p></>}
            {projectTab === '资产' && <><div className="text-3xl mb-3">📦</div><p className="text-sm">项目资产（开发中）</p></>}
            <p className="text-xs mt-1 text-gray-400">点击上方「任务」标签查看项目任务</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
