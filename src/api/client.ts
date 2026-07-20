import axios from 'axios';
import type { AgentResponse, ExecuteResponse, KnowledgeEntry, SkillEntry, HealthStatus } from './types';

const STORAGE_KEY = 'luoduo_server_url';
const DEFAULT_URL = 'https://tyb.ap100168.com';

export function getServerUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
}

export function setServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url);
}

function createClient() {
  const baseURL = getServerUrl();
  return axios.create({ baseURL, timeout: 60000 });
}

export const api = {
  getAgents: async (): Promise<AgentResponse> => {
    const { data } = await createClient().get('/api/agents');
    return data;
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
