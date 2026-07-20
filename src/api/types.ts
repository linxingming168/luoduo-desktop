export interface Agent {
  id: string;
  label: string;
  doc_type: string;
}

export interface AgentResponse {
  agents: Agent[];
  count: number;
}

export interface ExecuteResponse {
  ok: boolean;
  agent: string;
  reply?: string;
  error?: string;
  artifact?: string;
  download_url?: string;
}

export interface KnowledgeEntry {
  id: number;
  title?: string;
  question: string;
  answer: string;
  created_at?: string;
}

export interface SkillEntry {
  id: number;
  title?: string;
  description?: string;
  trigger?: string;
  steps?: string;
  category?: string;
}

export interface HealthStatus {
  status: string;
  agents?: number;
  skills?: number;
  knowledge?: number;
}
