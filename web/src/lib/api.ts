const BASE = "";

// Ephemeral session token for protected endpoints.
// Injected into index.html by the server — never fetched via API.
declare global {
  interface Window {
    __HERMES_SESSION_TOKEN__?: string;
  }
}
let _sessionToken: string | null = null;

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  // Inject the session token into all /api/ requests.
  const headers = new Headers(init?.headers);
  const token = window.__HERMES_SESSION_TOKEN__;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${url}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

async function getSessionToken(): Promise<string> {
  if (_sessionToken) return _sessionToken;
  const injected = window.__HERMES_SESSION_TOKEN__;
  if (injected) {
    _sessionToken = injected;
    return _sessionToken;
  }
  throw new Error("Session token not available — page must be served by the Hermes dashboard server");
}

export const api = {
  getStatus: () => fetchJSON<StatusResponse>("/api/status"),
  getSessions: (limit = 20, offset = 0) =>
    fetchJSON<PaginatedSessions>(`/api/sessions?limit=${limit}&offset=${offset}`),
  getSessionMessages: (id: string) =>
    fetchJSON<SessionMessagesResponse>(`/api/sessions/${encodeURIComponent(id)}/messages`),
  deleteSession: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getLogs: (params: { file?: string; lines?: number; level?: string; component?: string }) => {
    const qs = new URLSearchParams();
    if (params.file) qs.set("file", params.file);
    if (params.lines) qs.set("lines", String(params.lines));
    if (params.level && params.level !== "ALL") qs.set("level", params.level);
    if (params.component && params.component !== "all") qs.set("component", params.component);
    return fetchJSON<LogsResponse>(`/api/logs?${qs.toString()}`);
  },
  getAnalytics: (days: number) =>
    fetchJSON<AnalyticsResponse>(`/api/analytics/usage?days=${days}`),
  getConfig: () => fetchJSON<Record<string, unknown>>("/api/config"),
  getDefaults: () => fetchJSON<Record<string, unknown>>("/api/config/defaults"),
  getSchema: () => fetchJSON<{ fields: Record<string, unknown>; category_order: string[] }>("/api/config/schema"),
  getModelInfo: () => fetchJSON<ModelInfoResponse>("/api/model/info"),
  getAvailableModels: () =>
    fetchJSON<AvailableModelsResponse>("/api/models"),
  saveConfig: (config: Record<string, unknown>) =>
    fetchJSON<{ ok: boolean }>("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    }),
  getConfigRaw: () => fetchJSON<{ yaml: string }>("/api/config/raw"),
  saveConfigRaw: (yaml_text: string) =>
    fetchJSON<{ ok: boolean }>("/api/config/raw", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yaml_text }),
    }),
  getEnvVars: () => fetchJSON<Record<string, EnvVarInfo>>("/api/env"),
  setEnvVar: (key: string, value: string) =>
    fetchJSON<{ ok: boolean }>("/api/env", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }),
  deleteEnvVar: (key: string) =>
    fetchJSON<{ ok: boolean }>("/api/env", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    }),
  revealEnvVar: async (key: string) => {
    const token = await getSessionToken();
    return fetchJSON<{ key: string; value: string }>("/api/env/reveal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key }),
    });
  },

  // Cron jobs
  getCronJobs: () => fetchJSON<CronJob[]>("/api/cron/jobs"),
  createCronJob: (job: { prompt: string; schedule: string; name?: string; deliver?: string }) =>
    fetchJSON<CronJob>("/api/cron/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    }),
  pauseCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}/pause`, { method: "POST" }),
  resumeCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}/resume`, { method: "POST" }),
  triggerCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}/trigger`, { method: "POST" }),
  deleteCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/cron/jobs/${id}`, { method: "DELETE" }),

  // Skills & Toolsets
  getSkills: () => fetchJSON<SkillInfo[]>("/api/skills"),
  toggleSkill: (name: string, enabled: boolean) =>
    fetchJSON<{ ok: boolean }>("/api/skills/toggle", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, enabled }),
    }),
  getToolsets: () => fetchJSON<ToolsetInfo[]>("/api/tools/toolsets"),

  // Session search (FTS5)
  searchSessions: (q: string) =>
    fetchJSON<SessionSearchResponse>(`/api/sessions/search?q=${encodeURIComponent(q)}`),

  // OAuth provider management
  getOAuthProviders: () =>
    fetchJSON<OAuthProvidersResponse>("/api/providers/oauth"),
  disconnectOAuthProvider: async (providerId: string) => {
    const token = await getSessionToken();
    return fetchJSON<{ ok: boolean; provider: string }>(
      `/api/providers/oauth/${encodeURIComponent(providerId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },
  startOAuthLogin: async (providerId: string) => {
    const token = await getSessionToken();
    return fetchJSON<OAuthStartResponse>(
      `/api/providers/oauth/${encodeURIComponent(providerId)}/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: "{}",
      },
    );
  },
  submitOAuthCode: async (providerId: string, sessionId: string, code: string) => {
    const token = await getSessionToken();
    return fetchJSON<OAuthSubmitResponse>(
      `/api/providers/oauth/${encodeURIComponent(providerId)}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, code }),
      },
    );
  },
  pollOAuthSession: (providerId: string, sessionId: string) =>
    fetchJSON<OAuthPollResponse>(
      `/api/providers/oauth/${encodeURIComponent(providerId)}/poll/${encodeURIComponent(sessionId)}`,
    ),
  cancelOAuthSession: async (sessionId: string) => {
    const token = await getSessionToken();
    return fetchJSON<{ ok: boolean }>(
      `/api/providers/oauth/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  // Dashboard plugins
  getPlugins: () =>
    fetchJSON<PluginManifestResponse[]>("/api/dashboard/plugins"),
  rescanPlugins: () =>
    fetchJSON<{ ok: boolean; count: number }>("/api/dashboard/plugins/rescan"),

  // Dashboard themes
  getThemes: () =>
    fetchJSON<DashboardThemesResponse>("/api/dashboard/themes"),
  setTheme: (name: string) =>
    fetchJSON<{ ok: boolean; theme: string }>("/api/dashboard/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  // Activity feed
  getActivity: (limit = 50, offset = 0) =>
    fetchJSON<ActivityResponse>(`/api/activity?limit=${limit}&offset=${offset}`),

  // Skills marketplace
  searchMarketplace: (q = "", limit = 20) =>
    fetchJSON<MarketplaceResponse>(`/api/skills/marketplace?q=${encodeURIComponent(q)}&limit=${limit}`),
  installSkill: (identifier: string, category = "", force = false) =>
    fetchJSON<{ ok: boolean; identifier: string; output?: string; error?: string }>(
      "/api/skills/install",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, category, force }),
      },
    ),
  uninstallSkill: (name: string) =>
    fetchJSON<{ ok: boolean; name: string }>(`/api/skills/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),

  // Boards
  getBoards: () => fetchJSON<BoardsResponse>("/api/boards"),
  createBoard: (data: { name: string; description?: string; color?: string }) =>
    fetchJSON<Board>("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getBoard: (id: string) => fetchJSON<Board>(`/api/boards/${id}`),
  deleteBoard: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/boards/${id}`, { method: "DELETE" }),
  createTask: (boardId: string, data: Partial<Task>) =>
    fetchJSON<Task>(`/api/boards/${boardId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateTask: (taskId: string, data: Partial<Task>) =>
    fetchJSON<Task>(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteTask: (taskId: string) =>
    fetchJSON<{ ok: boolean }>(`/api/tasks/${taskId}`, { method: "DELETE" }),

  // Approvals
  getApprovals: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return fetchJSON<ApprovalsResponse>(`/api/approvals${qs}`);
  },
  approveAction: (id: string, reason = "") =>
    fetchJSON<Approval>(`/api/approvals/${id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, resolved_by: "web" }),
    }),
  denyAction: (id: string, reason = "") =>
    fetchJSON<Approval>(`/api/approvals/${id}/deny`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, resolved_by: "web" }),
    }),

  // Agents
  getDashboardAgents: () =>
    fetchJSON<DashboardAgentsResponse>("/api/agents"),
  spawnAgent: (goal: string, model = "", maxIterations = 90) =>
    fetchJSON<SpawnAgentResponse>("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, model, max_iterations: maxIterations }),
    }),
  stopAgent: (sessionId: string) =>
    fetchJSON<{ ok: boolean; session_id: string; status: string }>(
      `/api/agents/${sessionId}/stop`,
      { method: "POST" },
    ),

  // Chat
  sendMessage: (sessionId: string, message: string) =>
    fetchJSON<{ ok: boolean; session_id: string }>("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
    }),

  // File upload
  uploadFile: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const token = window.__HERMES_SESSION_TOKEN__;
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch("/api/upload", { method: "POST", headers, body: form });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ ok: boolean; filename: string; original_name: string; size: number; path: string }>;
  },

  // Mission Control: System Metrics
  getSystemMetrics: () => fetchJSON<SystemMetrics>("/api/system/metrics"),
  getMetricsHistory: (seconds = 300) =>
    fetchJSON<MetricsHistory>(`/api/system/metrics/history?seconds=${seconds}`),

  // Mission Control: Live Monitor
  getMonitorSessions: () =>
    fetchJSON<MonitorSessionsResponse>("/api/monitor/sessions"),

  // Mission Control: Collaboration
  getHandoffs: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return fetchJSON<HandoffsResponse>(`/api/collaboration/handoffs${qs}`);
  },
  createHandoff: (data: {
    from_session: string;
    to_session?: string;
    task: string;
    context?: string;
    priority?: string;
  }) =>
    fetchJSON<Handoff>("/api/collaboration/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  acceptHandoff: (id: string) =>
    fetchJSON<Handoff>(`/api/collaboration/handoffs/${id}/accept`, {
      method: "POST",
    }),
  completeHandoff: (id: string) =>
    fetchJSON<Handoff>(`/api/collaboration/handoffs/${id}/complete`, {
      method: "POST",
    }),
  getCollabGraph: () =>
    fetchJSON<CollabGraphResponse>("/api/collaboration/graph"),
};

export interface PlatformStatus {
  error_code?: string;
  error_message?: string;
  state: string;
  updated_at: string;
}

export interface StatusResponse {
  active_sessions: number;
  config_path: string;
  config_version: number;
  env_path: string;
  gateway_exit_reason: string | null;
  gateway_health_url: string | null;
  gateway_pid: number | null;
  gateway_platforms: Record<string, PlatformStatus>;
  gateway_running: boolean;
  gateway_state: string | null;
  gateway_updated_at: string | null;
  hermes_home: string;
  latest_config_version: number;
  release_date: string;
  version: string;
}

export interface SessionInfo {
  id: string;
  source: string | null;
  model: string | null;
  title: string | null;
  started_at: number;
  ended_at: number | null;
  last_active: number;
  is_active: boolean;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  preview: string | null;
}

export interface PaginatedSessions {
  sessions: SessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface EnvVarInfo {
  is_set: boolean;
  redacted_value: string | null;
  description: string;
  url: string | null;
  category: string;
  is_password: boolean;
  tools: string[];
  advanced: boolean;
}

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
  tool_name?: string;
  tool_call_id?: string;
  timestamp?: number;
}

export interface SessionMessagesResponse {
  session_id: string;
  messages: SessionMessage[];
}

export interface LogsResponse {
  file: string;
  lines: string[];
}

export interface AnalyticsDailyEntry {
  day: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number;
  actual_cost: number;
  sessions: number;
}

export interface AnalyticsModelEntry {
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  sessions: number;
}

export interface AnalyticsSkillEntry {
  skill: string;
  view_count: number;
  manage_count: number;
  total_count: number;
  percentage: number;
  last_used_at: number | null;
}

export interface AnalyticsSkillsSummary {
  total_skill_loads: number;
  total_skill_edits: number;
  total_skill_actions: number;
  distinct_skills_used: number;
}

export interface AnalyticsResponse {
  daily: AnalyticsDailyEntry[];
  by_model: AnalyticsModelEntry[];
  totals: {
    total_input: number;
    total_output: number;
    total_cache_read: number;
    total_reasoning: number;
    total_estimated_cost: number;
    total_actual_cost: number;
    total_sessions: number;
  };
  skills: {
    summary: AnalyticsSkillsSummary;
    top_skills: AnalyticsSkillEntry[];
  };
}

export interface CronJob {
  id: string;
  name?: string;
  prompt: string;
  schedule: { kind: string; expr: string; display: string };
  schedule_display: string;
  enabled: boolean;
  state: string;
  deliver?: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  last_error?: string | null;
}

export interface SkillInfo {
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export interface ToolsetInfo {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  tools: string[];
}

export interface SessionSearchResult {
  session_id: string;
  snippet: string;
  role: string | null;
  source: string | null;
  model: string | null;
  session_started: number | null;
}

export interface SessionSearchResponse {
  results: SessionSearchResult[];
}

// ── Activity feed types ─────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  type: "session" | "cron" | "tool" | "error";
  action: string;
  title: string;
  source: string;
  timestamp: number | null;
  details: Record<string, unknown>;
}

export interface ActivityResponse {
  events: ActivityEvent[];
  total: number;
}

export interface MarketplaceSkill {
  name: string;
  description: string;
  source: string;
  identifier: string;
  trust_level: string;
  tags: string[];
}

export interface MarketplaceResponse {
  skills: MarketplaceSkill[];
  query: string;
  error?: string;
}

// ── Board types ─────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  task_counts: { todo: number; in_progress: number; done: number };
  tasks?: Task[];
}

export interface Task {
  id: string;
  board_id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BoardsResponse {
  boards: Board[];
}

// ── Approval types ──────────────────────────────────────────────────

export interface Approval {
  id: string;
  session_id: string;
  tool_name: string;
  command: string;
  risk_level: string;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  reason: string | null;
}

export interface ApprovalsResponse {
  approvals: Approval[];
}

// ── Model info types ──────────────────────────────────────────────────

export interface ModelInfoResponse {
  model: string;
  provider: string;
  auto_context_length: number;
  config_context_length: number;
  effective_context_length: number;
  capabilities: {
    supports_tools?: boolean;
    supports_vision?: boolean;
    supports_reasoning?: boolean;
    context_window?: number;
    max_output_tokens?: number;
    model_family?: string;
  };
}

// ── OAuth provider types ────────────────────────────────────────────────

export interface OAuthProviderStatus {
  logged_in: boolean;
  source?: string | null;
  source_label?: string | null;
  token_preview?: string | null;
  expires_at?: string | null;
  has_refresh_token?: boolean;
  last_refresh?: string | null;
  error?: string;
}

export interface OAuthProvider {
  id: string;
  name: string;
  /** "pkce" (browser redirect + paste code), "device_code" (show code + URL),
   *  or "external" (delegated to a separate CLI like Claude Code or Qwen). */
  flow: "pkce" | "device_code" | "external";
  cli_command: string;
  docs_url: string;
  status: OAuthProviderStatus;
}

export interface OAuthProvidersResponse {
  providers: OAuthProvider[];
}

/** Discriminated union — the shape of /start depends on the flow. */
export type OAuthStartResponse =
  | {
      session_id: string;
      flow: "pkce";
      auth_url: string;
      expires_in: number;
    }
  | {
      session_id: string;
      flow: "device_code";
      user_code: string;
      verification_url: string;
      expires_in: number;
      poll_interval: number;
    };

export interface OAuthSubmitResponse {
  ok: boolean;
  status: "approved" | "error";
  message?: string;
}

export interface OAuthPollResponse {
  session_id: string;
  status: "pending" | "approved" | "denied" | "expired" | "error";
  error_message?: string | null;
  expires_at?: number | null;
}

// ── Dashboard theme types ──────────────────────────────────────────────

export interface DashboardThemeSummary {
  description: string;
  label: string;
  name: string;
}

export interface DashboardThemesResponse {
  active: string;
  themes: DashboardThemeSummary[];
}

// ── Dashboard plugin types ─────────────────────────────────────────────

export interface PluginManifestResponse {
  name: string;
  label: string;
  description: string;
  icon: string;
  version: string;
  tab: { path: string; position: string };
  entry: string;
  css?: string | null;
  has_api: boolean;
  source: string;
}

// ── Agent lifecycle types ─────────────────────────────────────────

export interface DashboardAgent {
  session_id: string;
  goal: string;
  model: string;
  status: "starting" | "running" | "completed" | "failed" | "stopped";
  started_at: number;
  finished_at: number | null;
  error: string | null;
  result: string | null;
}

export interface DashboardAgentsResponse {
  agents: DashboardAgent[];
}

export interface SpawnAgentResponse {
  session_id: string;
  goal: string;
  status: string;
}

export interface AvailableModelsResponse {
  current_provider: string;
  providers: Record<string, string[]>;
}

// ── Mission Control: System Metrics ──────────────────────────────

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    percent: number;
    count: number;
    per_core: number[];
    load_avg: { "1m": number; "5m": number; "15m": number };
  };
  memory: {
    total: number;
    available: number;
    used: number;
    percent: number;
    swap_total: number;
    swap_used: number;
    swap_percent: number;
  };
  disks: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
  };
  top_processes: Array<{
    pid: number;
    name: string;
    cpu_percent: number;
    memory_percent: number;
  }>;
}

export interface MetricsSample {
  ts: number;
  cpu: number;
  mem: number;
}

export interface MetricsHistory {
  samples: MetricsSample[];
  interval: number;
}

// ── Mission Control: Monitor ─────────────────────────────────────

export interface MonitorSession {
  id: string;
  source: string | null;
  model: string | null;
  title: string | null;
  started_at: number | null;
  last_active: number | null;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  agent_status?: string;
  current_tool?: string | null;
  iteration?: number;
  error?: string | null;
}

export interface MonitorSessionsResponse {
  sessions: MonitorSession[];
}

// ── Mission Control: Collaboration ───────────────────────────────

export interface Handoff {
  id: string;
  from_session: string;
  to_session: string | null;
  task: string;
  context: string | null;
  priority: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  created_at: number;
  accepted_at: number | null;
  completed_at: number | null;
}

export interface HandoffsResponse {
  handoffs: Handoff[];
}

export interface CollabNode {
  id: string;
  label: string;
  handoffs_out: number;
  handoffs_in: number;
}

export interface CollabEdge {
  id: string;
  from: string;
  to: string;
  task: string;
  status: string;
  created_at: number;
}

export interface CollabGraphResponse {
  nodes: CollabNode[];
  edges: CollabEdge[];
}
