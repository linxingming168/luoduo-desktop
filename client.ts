import axios from 'axios';
import type { AgentResponse, ExecuteResponse, KnowledgeEntry, SkillEntry, HealthStatus, Agent } from './types';

const STORAGE_KEY = 'luoduo_server_url';
const KEY_KEY = 'luoduo_api_key';
const DEFAULT_URL = 'https://tyb.ap100168.com';

export function getServerUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
}

export function setServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url);
}

export function getApiKey(): string {
  return localStorage.getItem(KEY_KEY) || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_KEY, key.trim());
}

// 军团花名册：id -> { label, role, emoji, skills }
// 🔒 固化名册（2026-07-27）：所有智能体必须在此有清晰名称+角色+技能标识。
// 服务器 /api/health 现已返回 agents_detail（名称+技能，由 AGENTS 单一来源派生），
// 客户端优先用服务器数据；本 ROSTER 仅作离线兜底，新增/更名务必同步双方，勿回退成裸 id。
export const ROSTER: Record<string, { label: string; role: string; emoji: string; skills?: string[] }> = {
  zhuge: { label: '诸葛亮', role: 'CEO 总战略', emoji: '🧠' },
  fanli: { label: '范蠡', role: '产品规划', emoji: '📦' },
  hekun: { label: '和珅', role: '财务', emoji: '💰' },
  zhangqian: { label: '张骞', role: '市场拓展', emoji: '🚀' },
  shangyang: { label: '商鞅', role: '法务合规', emoji: '⚖️' },
  squirrel: { label: '松鼠', role: '运维保障', emoji: '🛠️' },
  luban: { label: '鲁班', role: '工程建设', emoji: '🔧' },
  bianque: { label: '扁鹊', role: '健康医疗', emoji: '🩺' },
  zuchongzhi: { label: '祖冲之', role: '算法数学', emoji: '🧮' },
  guiguzi: { label: '鬼谷子', role: '谋略兵法', emoji: '🎯' },
  guanzhong: { label: '管仲', role: '经济治理', emoji: '📊' },
  cailun: { label: '蔡伦', role: '内容创作', emoji: '✍️' },
  shenkuo: { label: '沈括', role: '科技综合', emoji: '🔬' },
  mozi: { label: '墨子', role: '工程逻辑', emoji: '📐' },
  bixin: { label: '笔芯秘书', role: '首席知识官·归档与技能管家', emoji: '📝', skills: ['归档整理', '技能提取', '知识管理', '备注记录', '信息归档'] },
  id374: { label: '阿前', role: '前端交互工程师', emoji: '🎨', skills: ['前端开发', 'React/Vue/TS', '小程序开发', 'UI组件', '前端测试'] },
  id375: { label: '阿后', role: '后端逻辑工程师', emoji: '⚙️', skills: ['后端开发', 'Python/FastAPI', 'REST API', 'DB设计', '后端测试'] },
  id411: { label: '阿运', role: 'DevOps集成工程师', emoji: '🚀', skills: ['DevOps', 'Docker', 'CI/CD', 'Nginx配置', '部署脚本'] },
  id412: { label: '阿嵌', role: '嵌入式固件工程师', emoji: '🔧', skills: ['嵌入式开发', 'C/RTOS', 'STM32', '固件开发', '驱动开发'] },
};

export function decorateAgent(id: string): Agent {
  const m = ROSTER[id];
  return {
    id,
    label: m?.label || id,
    role: m?.role || '智能体',
    emoji: m?.emoji || '🤖',
    skills: m?.skills || [],
    doc_type: '',
  };
}

export function createClient() {
  const baseURL = getServerUrl();
  const client = axios.create({ baseURL, timeout: 60000 });
  client.interceptors.request.use((config) => {
    const key = getApiKey();
    if (key) {
      // 同时支持 ?api_key= 与 Authorization: Bearer 两种鉴权，兼容不同后端实现
      config.params = { ...(config.params || {}), api_key: key };
      (config.headers as Record<string, string>) = {
        ...(config.headers as Record<string, string>),
        Authorization: `Bearer ${key}`,
      };
    }
    return config;
  });
  return client;
}

// 统一解析列表接口：兼容 数组 / {items} / {results} / {skills} / {knowledge} 及更多嵌套结构；
// 出错时抛出带状态码的错误；若 200 但解析不出列表，抛出带原始响应的诊断错误（便于定位后端真实结构）。
async function getList(
  path: string,
  params?: Record<string, unknown>,
  fallbacks: string[] = [
    'items',
    'results',
    'skills',
    'knowledge',
    'data',
    'list',
    'records',
    'content',
    'payload',
    'value',
    'rows',
  ],
): Promise<unknown[]> {
  let resp: { data: unknown; status: number };
  try {
    resp = await createClient().get(path, params ? { params } : undefined);
  } catch (e: unknown) {
    const ax = e as { response?: { status?: number; data?: { detail?: string } }; message?: string };
    const err = new Error(ax?.response?.data?.detail || ax?.message || '请求失败') as Error & {
      status?: number;
    };
    err.status = ax?.response?.status;
    throw err;
  }
  const data = resp.data;
  if (Array.isArray(data)) return data;
  for (const f of fallbacks) {
    const v = (data as Record<string, unknown>)?.[f];
    if (Array.isArray(v)) return v as unknown[];
  }
  // 200 但解析不出列表：抛出带原始响应的诊断错误
  const raw = typeof data === 'string' ? data : JSON.stringify(data);
  const diag = new Error('后端返回成功(200)，但响应结构无法解析为技能/知识列表') as Error & {
    status?: number;
    diagnostic?: string;
  };
  diag.status = resp.status;
  diag.diagnostic = raw.slice(0, 600);
  throw diag;
}

export const api = {
  // 智能体名册走公开的 /api/health（免密钥）。
  // 🔒 固化：优先用服务器 agents_detail（名称+角色+技能，由 AGENTS 单一来源派生），
  // 升级不会丢失；仅当服务器未返回 agents_detail 时回退到本地 ROSTER 装饰裸 id。
  getAgents: async (): Promise<AgentResponse> => {
    try {
      const { data } = await createClient().get('/api/health');
      const detail = Array.isArray(data?.agents_detail) ? data.agents_detail : [];
      if (detail.length > 0) {
        const agents: Agent[] = detail.map((a: any) => ({
          id: a.id,
          label: a.name || a.id,
          role: a.role || '智能体',
          emoji: a.emoji || '🤖',
          skills: Array.isArray(a.skills) ? a.skills : [],
          doc_type: '',
        }));
        return { agents, count: agents.length };
      }
      const ids: string[] = Array.isArray(data?.agents) ? data.agents : [];
      return { agents: ids.map(decorateAgent), count: ids.length };
    } catch {
      return { agents: [], count: 0 };
    }
  },

  executeAgent: async (
    agentId: string,
    payload: { instruction: string },
    signal?: AbortSignal,
  ): Promise<ExecuteResponse> => {
    // 长任务（子智能体 / skydo 采集等）易超 60s 全局上限被 axios 掐断；
    // 放宽到 5 分钟，并保留 signal 让用户可主动取消。真正的根治见 async+taskId 轮询方案。
    const { data } = await createClient().post(`/api/agent/${agentId}/execute`, payload, {
      signal,
      timeout: 300000,
    });
    return data;
  },

  chat: async (message: string, agentId?: string, images?: string[]): Promise<string> => {
    const body: Record<string, unknown> = { message };
    if (agentId) body.agent = agentId;
    // 后端 /api/chat 原生支持 images（dataURL/base64/URL 列表），走视觉模型
    if (images && images.length) body.images = images;
    // 长推理 / 长代码生成可能超过 3 分钟，放宽到 5 分钟，与 executeAgent 拉齐
    const { data } = await createClient().post('/api/chat', body, { timeout: 300000 });
    return data.reply || data.response || JSON.stringify(data);
  },

  searchKnowledge: (query: string): Promise<KnowledgeEntry[]> =>
    query.trim()
      ? (getList('/api/knowledge/search', { q: query }, ['items', 'results', 'knowledge']) as Promise<KnowledgeEntry[]>)
      : Promise.resolve([]),

  listKnowledge: (): Promise<KnowledgeEntry[]> =>
    getList('/api/knowledge/list', undefined, ['items', 'results', 'knowledge']) as Promise<KnowledgeEntry[]>,

  searchSkills: (query: string): Promise<SkillEntry[]> =>
    query.trim()
      ? (getList('/api/skills/search', { q: query }, ['items', 'results', 'skills']) as Promise<SkillEntry[]>)
      : Promise.resolve([]),

  listSkills: (): Promise<SkillEntry[]> =>
    getList('/api/skills/list', undefined, ['items', 'results', 'skills']) as Promise<SkillEntry[]>,

  getHealth: async (): Promise<HealthStatus | null> => {
    try {
      const { data } = await createClient().get('/api/health');
      return data;
    } catch {
      return null;
    }
  },
};
