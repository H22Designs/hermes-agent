import { useEffect, useState } from "react";
import {
  Clock,
  Cpu,
  Eye,
  HardDrive,
  LayoutGrid,
  MemoryStick,
  MessageSquare,
  Package,
  Radio,
  Settings,
  ToggleLeft,
  ToggleRight,
  Users,
  Zap,
} from "lucide-react";
import { H2 } from "@nous-research/ui";
import { fetchJSON } from "@/lib/api";
import type {
  StatusResponse,
  SystemMetrics,
  MonitorSessionsResponse,
  HandoffsResponse,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// ── Widget registry ───────────────────────────────────────────────

interface WidgetDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultVisible: boolean;
  defaultSize: "sm" | "md" | "lg";
  component: React.ComponentType;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1_024).toFixed(0)} KB`;
}

// ── Widget: System Health ─────────────────────────────────────────

function SystemHealthWidget() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    fetchJSON<SystemMetrics>("/api/system/metrics")
      .then(setMetrics)
      .catch(() => {});
    const interval = setInterval(() => {
      fetchJSON<SystemMetrics>("/api/system/metrics")
        .then(setMetrics)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return <div className="text-xs text-muted-foreground py-4 text-center">Loading...</div>;
  }

  const cpuPct = metrics.cpu.percent;
  const memPct = metrics.memory.percent;
  const diskMax = Math.max(...metrics.disks.map((d) => d.percent), 0);

  const barColor = (pct: number) =>
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-success";

  return (
    <div className="space-y-3">
      {/* CPU */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <Cpu className="h-3 w-3" /> CPU
          </span>
          <span className={cpuPct >= 80 ? "text-warning" : "text-success"}>{cpuPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor(cpuPct)}`} style={{ width: `${cpuPct}%` }} />
        </div>
      </div>
      {/* Memory */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <MemoryStick className="h-3 w-3" /> RAM
          </span>
          <span className={memPct >= 80 ? "text-warning" : "text-success"}>
            {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor(memPct)}`} style={{ width: `${memPct}%` }} />
        </div>
      </div>
      {/* Disk */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <HardDrive className="h-3 w-3" /> Disk (max)
          </span>
          <span className={diskMax >= 80 ? "text-warning" : "text-success"}>{diskMax.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor(diskMax)}`} style={{ width: `${diskMax}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Widget: Gateway Status ────────────────────────────────────────

function GatewayWidget() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    fetchJSON<StatusResponse>("/api/status").then(setStatus).catch(() => {});
    const interval = setInterval(() => {
      fetchJSON<StatusResponse>("/api/status").then(setStatus).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return <div className="text-xs text-muted-foreground py-4 text-center">Loading...</div>;

  const platforms = Object.entries(status.gateway_platforms ?? {});

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={status.gateway_running ? "success" : "destructive"} className="text-[9px]">
          {status.gateway_running ? "Running" : "Stopped"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">v{status.version}</span>
      </div>
      {platforms.map(([name, info]) => (
        <div key={name} className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground capitalize">{name}</span>
          <Badge variant={info.state === "connected" ? "success" : "outline"} className="text-[8px]">
            {info.state}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ── Widget: Active Sessions ───────────────────────────────────────

function ActiveSessionsWidget() {
  const [sessions, setSessions] = useState<MonitorSessionsResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJSON<MonitorSessionsResponse>("/api/monitor/sessions")
      .then(setSessions)
      .catch(() => {});
    const interval = setInterval(() => {
      fetchJSON<MonitorSessionsResponse>("/api/monitor/sessions")
        .then(setSessions)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const active = sessions?.sessions || [];

  return (
    <div className="space-y-2">
      {active.length === 0 && (
        <div className="text-[10px] text-muted-foreground text-center py-2">No active sessions</div>
      )}
      {active.slice(0, 5).map((s) => (
        <button
          key={s.id}
          onClick={() => navigate("/monitor")}
          className="w-full text-left flex items-center justify-between py-1.5 px-2 hover:bg-accent/50 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium truncate">{s.title || s.id.slice(0, 16)}</div>
            <div className="text-[9px] text-muted-foreground">
              {(s.model || "unknown").split("/").pop()} · {s.message_count} msgs
            </div>
          </div>
          {s.agent_status === "running" && (
            <Badge variant="success" className="text-[8px] shrink-0">
              <span className="mr-0.5 inline-block h-1 w-1 animate-pulse rounded-full bg-current" />
              live
            </Badge>
          )}
        </button>
      ))}
      {active.length > 5 && (
        <button
          onClick={() => navigate("/monitor")}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
        >
          View all {active.length} sessions →
        </button>
      )}
    </div>
  );
}

// ── Widget: Quick Actions ─────────────────────────────────────────

function QuickActionsWidget() {
  const navigate = useNavigate();
  const actions = [
    { icon: Eye, label: "Live Monitor", path: "/monitor" },
    { icon: MessageSquare, label: "New Chat", path: "/chat" },
    { icon: LayoutGrid, label: "Boards", path: "/boards" },
    { icon: Clock, label: "Cron Jobs", path: "/cron" },
    { icon: Package, label: "Skills", path: "/skills" },
    { icon: Settings, label: "Settings", path: "/config" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map(({ icon: Icon, label, path }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className="flex flex-col items-center gap-1.5 p-3 border border-border hover:border-primary/40 hover:bg-accent/50 transition-colors"
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Widget: Collaboration Summary ─────────────────────────────────

function CollabWidget() {
  const [handoffs, setHandoffs] = useState<HandoffsResponse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJSON<HandoffsResponse>("/api/collaboration/handoffs")
      .then(setHandoffs)
      .catch(() => {});
  }, []);

  const items = handoffs?.handoffs || [];
  const pending = items.filter((h) => h.status === "pending").length;
  const active = items.filter((h) => h.status === "in_progress").length;
  const done = items.filter((h) => h.status === "completed").length;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold font-mondwest text-warning">{pending}</div>
          <div className="text-[9px] text-muted-foreground">Pending</div>
        </div>
        <div>
          <div className="text-lg font-bold font-mondwest text-info">{active}</div>
          <div className="text-[9px] text-muted-foreground">Active</div>
        </div>
        <div>
          <div className="text-lg font-bold font-mondwest text-success">{done}</div>
          <div className="text-[9px] text-muted-foreground">Done</div>
        </div>
      </div>
      <button
        onClick={() => navigate("/collaboration")}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full text-center py-1"
      >
        View all →
      </button>
    </div>
  );
}

// ── Widget definitions ────────────────────────────────────────────

const WIDGETS: WidgetDef[] = [
  { id: "system", label: "System Health", icon: Cpu, defaultVisible: true, defaultSize: "sm", component: SystemHealthWidget },
  { id: "gateway", label: "Gateway", icon: Radio, defaultVisible: true, defaultSize: "sm", component: GatewayWidget },
  { id: "sessions", label: "Active Sessions", icon: MessageSquare, defaultVisible: true, defaultSize: "md", component: ActiveSessionsWidget },
  { id: "actions", label: "Quick Actions", icon: Zap, defaultVisible: true, defaultSize: "md", component: QuickActionsWidget },
  { id: "collab", label: "Collaboration", icon: Users, defaultVisible: true, defaultSize: "sm", component: CollabWidget },
];

// ── Widget visibility (persisted) ─────────────────────────────────

function getWidgetState(): Record<string, { visible: boolean }> {
  try {
    return JSON.parse(localStorage.getItem("hermes-home-widgets") || "{}");
  } catch {
    return {};
  }
}

function setWidgetState(state: Record<string, { visible: boolean }>) {
  localStorage.setItem("hermes-home-widgets", JSON.stringify(state));
}

// ── Main Component ────────────────────────────────────────────────

export default function HomeDashboard() {
  const [widgetState, setWidgetState_] = useState<Record<string, { visible: boolean }>>(getWidgetState);
  const [editMode, setEditMode] = useState(false);

  const toggleWidget = (id: string) => {
    const current = widgetState[id]?.visible ?? WIDGETS.find((w) => w.id === id)?.defaultVisible ?? true;
    const next = { ...widgetState, [id]: { visible: !current } };
    setWidgetState_(next);
    setWidgetState(next);
  };

  const visibleWidgets = WIDGETS.filter(
    (w) => widgetState[w.id]?.visible ?? w.defaultVisible
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <H2>Mission Control</H2>
          <p className="text-xs text-muted-foreground mt-1">
            Welcome back. {visibleWidgets.length} widgets active.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditMode(!editMode)}
          className="gap-1.5"
        >
          {editMode ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          {editMode ? "Done" : "Customize"}
        </Button>
      </div>

      {/* Edit mode: widget toggles */}
      {editMode && (
        <Card className="border-dashed">
          <CardContent className="py-3">
            <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
              Toggle widgets
            </div>
            <div className="flex flex-wrap gap-2">
              {WIDGETS.map((w) => {
                const visible = widgetState[w.id]?.visible ?? w.defaultVisible;
                const Icon = w.icon;
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] border transition-colors ${
                      visible
                        ? "border-primary text-primary bg-primary/5"
                        : "border-border text-muted-foreground opacity-50"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {w.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleWidgets.map((w) => {
          const Widget = w.component;
          const Icon = w.icon;
          return (
            <Card key={w.id} className={w.defaultSize === "md" ? "md:col-span-1 lg:col-span-1" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {w.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Widget />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
