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
  const key = getApiKey();
  if (key) {
    client.interceptors.request.use((config) => {
      config.params = { ...(config.params || {}), api_key: key };
      return config;
    });
  }
  return client;
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

  searchKnowledge: async (query: string): Promise<KnowledgeEntry[]> => {
    if (!query.trim()) return [];
    const { data } = await createClient().get('/api/knowledge/search', { params: { q: query } });
    return Array.isArray(data) ? data : data.results || [];
  },

  listKnowledge: async (): Promise<KnowledgeEntry[]> => {
    const { data } = await createClient().get('/api/knowledge/list');
    return Array.isArray(data) ? data : data.results || data.knowledge || [];
  },

  searchSkills: async (query: string): Promise<SkillEntry[]> => {
    if (!query.trim()) return [];
    const { data } = await createClient().get('/api/skills/search', { params: { q: query } });
    return Array.isArray(data) ? data : data.results || [];
  },

  listSkills: async (): Promise<SkillEntry[]> => {
    const { data } = await createClient().get('/api/skills/list');
    return Array.isArray(data) ? data : data.results || data.skills || [];
  },

  getHealth: async (): Promise<HealthStatus | null> => {
    try {
      const { data } = await createClient().get('/api/health');
      return data;
    } catch {
      return null;
    }
  },
};
