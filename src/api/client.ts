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

// 军团花名册：id -> { label, role, emoji }（按落朵大脑 jt_health 运行态 18 位）
export const ROSTER: Record<string, { label: string; role: string; emoji: string }> = {
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
  id374: { label: 'id374', role: '扩展入驻位', emoji: '🤖' },
  id375: { label: 'id375', role: '扩展入驻位', emoji: '🤖' },
  id411: { label: 'id411', role: '扩展入驻位', emoji: '🤖' },
  id412: { label: 'id412', role: '扩展入驻位', emoji: '🤖' },
};

export function decorateAgent(id: string): Agent {
  const m = ROSTER[id];
  return {
    id,
    label: m?.label || id,
    role: m?.role || '智能体',
    emoji: m?.emoji || '🤖',
    doc_type: '',
  };
}

function createClient() {
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
  // 智能体名册走公开的 /api/health（免密钥），按花名册装饰；
  // 原 /api/agents 需密钥会 401，故不以它为准。
  getAgents: async (): Promise<AgentResponse> => {
    try {
      const { data } = await createClient().get('/api/health');
      const ids: string[] = Array.isArray(data?.agents) ? data.agents : [];
      return { agents: ids.map(decorateAgent), count: ids.length };
    } catch {
      return { agents: [], count: 0 };
    }
  },

  executeAgent: async (agentId: string, payload: { instruction: string }): Promise<ExecuteResponse> => {
    const { data } = await createClient().post(`/api/agent/${agentId}/execute`, payload);
    return data;
  },

  chat: async (message: string): Promise<string> => {
    const { data } = await createClient().post('/api/chat', { message });
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
