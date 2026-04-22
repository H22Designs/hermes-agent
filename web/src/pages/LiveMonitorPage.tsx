import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity,
  Bot,
  Clock,
  Eye,
  Loader2,
  MessageSquare,
  Radio,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";
import { Cell, Grid, H2 } from "@nous-research/ui";
import { fetchJSON } from "@/lib/api";
import type { MonitorSessionsResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────

interface MonitorSession {
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

interface LiveEvent {
  type: string;
  session_id: string;
  tool_name?: string;
  result_preview?: string;
  duration?: number;
  ts?: number;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const SOURCE_ICONS: Record<string, typeof Terminal> = {
  cli: Terminal,
  telegram: MessageSquare,
  discord: MessageSquare,
  cron: Clock,
};

// ── Component ─────────────────────────────────────────────────────

export default function LiveMonitorPage() {
  const [sessions, setSessions] = useState<MonitorSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load active sessions
  const loadSessions = useCallback(() => {
    fetchJSON<MonitorSessionsResponse>("/api/monitor/sessions")
      .then((data) => {
        setSessions(data.sessions || []);
        setLoading(false);
        // Auto-select first session if none selected
        if (!selectedId && data.sessions?.length > 0) {
          setSelectedId(data.sessions[0].id);
        }
      })
      .catch(() => setLoading(false));
  }, [selectedId]);

  // Connect to global SSE stream
  const connectStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/monitor/stream");
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event: LiveEvent = JSON.parse(e.data);
        if (event.type === "heartbeat") return;

        // Add to events if it matches selected session or is global
        if (!selectedId || event.session_id === selectedId || event.type === "session_join" || event.type === "session_leave") {
          setLiveEvents((prev) => {
            const next = [...prev, event];
            return next.slice(-200); // keep last 200 events
          });
        }

        // Refresh session list on join/leave
        if (event.type === "session_join" || event.type === "session_leave") {
          loadSessions();
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 3s
      reconnectTimer.current = setTimeout(connectStream, 3000);
    };
  }, [selectedId, loadSessions]);

  // Poll sessions + connect SSE
  useEffect(() => {
    loadSessions();
    const pollInterval = setInterval(loadSessions, 5000);
    connectStream();

    return () => {
      clearInterval(pollInterval);
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  // Scroll to bottom on new events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveEvents]);

  // Clear events when switching sessions
  useEffect(() => {
    setLiveEvents([]);
  }, [selectedId]);

  const selectedSession = sessions.find((s) => s.id === selectedId);

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-success" />
          <H2>Live Monitor</H2>
          <Badge variant={connected ? "success" : "destructive"} className="text-[10px]">
            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse bg-current" : "bg-current"}`} />
            {connected ? "SSE Connected" : "Disconnected"}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadSessions}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <Grid className="border-b lg:!grid-cols-4">
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Active Sessions</span>
          <span className="text-2xl font-bold font-mondwest">{sessions.length}</span>
        </Cell>
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Running Agents</span>
          <span className="text-2xl font-bold font-mondwest">
            {sessions.filter((s) => s.agent_status === "running").length}
          </span>
        </Cell>
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Tool Calls</span>
          <span className="text-2xl font-bold font-mondwest">
            {sessions.reduce((a, s) => a + s.tool_call_count, 0)}
          </span>
        </Cell>
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Tokens</span>
          <span className="text-2xl font-bold font-mondwest">
            {formatTokens(sessions.reduce((a, s) => a + s.input_tokens + s.output_tokens, 0))}
          </span>
        </Cell>
      </Grid>

      {/* Main layout: session list + event stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Session list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No active sessions</p>
            )}
            {sessions.map((s) => {
              const isSelected = s.id === selectedId;
              const SourceIcon = SOURCE_ICONS[s.source || ""] || Bot;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`text-left p-3 border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <SourceIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-xs font-medium truncate">
                        {s.title || s.id.slice(0, 16)}
                      </span>
                    </div>
                    {s.agent_status === "running" && (
                      <Badge variant="success" className="text-[9px] shrink-0">
                        <span className="mr-1 inline-block h-1 w-1 animate-pulse rounded-full bg-current" />
                        live
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div>
                      {(s.model || "unknown").split("/").pop()} · {s.message_count} msgs · {s.tool_call_count} tools
                    </div>
                    <div>
                      {formatTokens(s.input_tokens)} in / {formatTokens(s.output_tokens)} out
                    </div>
                    {s.current_tool && (
                      <div className="text-warning flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Running: {s.current_tool}
                      </div>
                    )}
                    {s.error && (
                      <div className="text-destructive truncate">Error: {s.error}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Live event stream */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {selectedSession
                ? `Events — ${selectedSession.title || selectedSession.id.slice(0, 16)}`
                : "Event Stream"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 border border-border p-3 font-mono text-xs h-[500px] overflow-y-auto">
              {liveEvents.length === 0 && (
                <div className="text-muted-foreground text-center py-8">
                  Waiting for events...
                </div>
              )}
              {liveEvents.map((ev, i) => (
                <div key={i} className="py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">
                    [{new Date((ev.ts || Date.now() / 1000) * 1000).toLocaleTimeString()}]
                  </span>{" "}
                  {ev.type === "session_join" && (
                    <span className="text-success">+ Session joined: {ev.session_id?.slice(0, 12)}</span>
                  )}
                  {ev.type === "session_leave" && (
                    <span className="text-warning">- Session left: {ev.session_id?.slice(0, 12)}</span>
                  )}
                  {ev.type === "tool_start" && (
                    <span className="text-info">
                      <Zap className="inline h-3 w-3 mr-1" />
                      Tool: <span className="text-foreground">{ev.tool_name}</span>
                    </span>
                  )}
                  {ev.type === "tool_complete" && (
                    <span className="text-success">
                      ✓ {ev.tool_name} ({ev.duration?.toFixed(2)}s)
                    </span>
                  )}
                  {ev.type === "iteration" && (
                    <span className="text-muted-foreground">
                      Iteration {ev.session_id}
                    </span>
                  )}
                  {ev.type === "error" && (
                    <span className="text-destructive">✗ Error: {ev.result_preview}</span>
                  )}
                  {ev.type === "done" && (
                    <span className="text-success font-bold">✓ Agent completed</span>
                  )}
                </div>
              ))}
              <div ref={eventsEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
