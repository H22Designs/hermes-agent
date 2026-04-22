import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { Cell, Grid, H2 } from "@nous-research/ui";
import { fetchJSON } from "@/lib/api";
import type { Handoff, HandoffsResponse, CollabGraphResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "text-warning border-warning",
  in_progress: "text-info border-info",
  completed: "text-success border-success",
  failed: "text-destructive border-destructive",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

// ── Handoff Card ──────────────────────────────────────────────────

function HandoffCard({
  handoff,
  onAccept,
  onComplete,
}: {
  handoff: Handoff;
  onAccept: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const StatusIcon = STATUS_ICONS[handoff.status] || Clock;
  const statusColor = STATUS_COLORS[handoff.status] || "text-muted-foreground";

  return (
    <div className={`border p-4 space-y-3 ${statusColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`h-4 w-4 ${handoff.status === "in_progress" ? "animate-spin" : ""}`}
          />
          <span className="text-xs font-mono">{handoff.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px]">
            {PRIORITY_LABELS[handoff.priority] || handoff.priority}
          </Badge>
          <Badge
            variant={
              handoff.status === "completed"
                ? "success"
                : handoff.status === "failed"
                ? "destructive"
                : "outline"
            }
            className="text-[9px]"
          >
            {handoff.status}
          </Badge>
        </div>
      </div>

      <p className="text-sm">{handoff.task}</p>

      {handoff.context && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 font-mono">
          {handoff.context}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono" title={handoff.from_session}>
          From: {handoff.from_session.slice(0, 12)}...
        </span>
        <ArrowRight className="h-3 w-3" />
        {handoff.to_session ? (
          <span className="font-mono" title={handoff.to_session}>
            To: {handoff.to_session.slice(0, 12)}...
          </span>
        ) : (
          <span className="italic">Pending assignment</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Created {timeAgo(handoff.created_at)}
          {handoff.completed_at && ` · Completed ${timeAgo(handoff.completed_at)}`}
        </span>
        <div className="flex gap-2">
          {handoff.status === "pending" && (
            <Button size="sm" variant="outline" onClick={() => onAccept(handoff.id)}>
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
          )}
          {handoff.status === "in_progress" && (
            <Button size="sm" variant="outline" onClick={() => onComplete(handoff.id)}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Graph Visualization ───────────────────────────────────────────

function CollabGraphView({ graph }: { graph: CollabGraphResponse }) {
  if (graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No collaboration history yet. Create a handoff to see the graph.
      </div>
    );
  }

  // Simple layout: nodes in a circle, edges as arrows
  const nodeCount = graph.nodes.length;
  const radius = 120;
  const cx = 180;
  const cy = 140;

  const nodePositions = graph.nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    return {
      ...n,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  const posMap = Object.fromEntries(nodePositions.map((n) => [n.id, n]));

  return (
    <svg viewBox="0 0 360 280" className="w-full max-w-md mx-auto">
      {/* Edges */}
      {graph.edges.map((e) => {
        const from = posMap[e.from];
        const to = posMap[e.to];
        if (!from || !to) return null;
        const color =
          e.status === "completed"
            ? "#22c55e"
            : e.status === "failed"
            ? "#ef4444"
            : e.status === "in_progress"
            ? "#3b82f6"
            : "#a1a1aa";
        return (
          <g key={e.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      })}
      {/* Arrow marker */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#a1a1aa" />
        </marker>
      </defs>
      {/* Nodes */}
      {nodePositions.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r="20"
            fill="black"
            stroke="#a1a1aa"
            strokeWidth="1.5"
          />
          <text
            x={n.x}
            y={n.y - 4}
            textAnchor="middle"
            fill="#a1a1aa"
            fontSize="8"
            fontFamily="monospace"
          >
            {n.label.slice(0, 8)}
          </text>
          <text
            x={n.x}
            y={n.y + 8}
            textAnchor="middle"
            fill="#525252"
            fontSize="7"
          >
            {n.handoffs_out}→ {n.handoffs_in}←
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function CollaborationPage() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [graph, setGraph] = useState<CollabGraphResponse>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  // New handoff form
  const [showForm, setShowForm] = useState(false);
  const [fromSession, setFromSession] = useState("");
  const [task, setTask] = useState("");
  const [context, setContext] = useState("");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [h, g] = await Promise.all([
        fetchJSON<HandoffsResponse>("/api/collaboration/handoffs"),
        fetchJSON<CollabGraphResponse>("/api/collaboration/graph"),
      ]);
      setHandoffs(h.handoffs || []);
      setGraph(g);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCreate = async () => {
    if (!task.trim()) return;
    setSubmitting(true);
    try {
      await fetchJSON<Handoff>("/api/collaboration/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_session: fromSession || "dashboard",
          task: task.trim(),
          context: context.trim() || null,
          priority,
        }),
      });
      setTask("");
      setContext("");
      setFromSession("");
      setShowForm(false);
      loadData();
    } catch {
      // silent
    }
    setSubmitting(false);
  };

  const handleAccept = async (id: string) => {
    await fetchJSON<Handoff>(`/api/collaboration/handoffs/${id}/accept`, { method: "POST" });
    loadData();
  };

  const handleComplete = async (id: string) => {
    await fetchJSON<Handoff>(`/api/collaboration/handoffs/${id}/complete`, { method: "POST" });
    loadData();
  };

  const filtered =
    filter === "all" ? handoffs : handoffs.filter((h) => h.status === filter);

  // Stats
  const stats = {
    total: handoffs.length,
    pending: handoffs.filter((h) => h.status === "pending").length,
    in_progress: handoffs.filter((h) => h.status === "in_progress").length,
    completed: handoffs.filter((h) => h.status === "completed").length,
    failed: handoffs.filter((h) => h.status === "failed").length,
  };

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
          <Users className="h-5 w-5 text-primary" />
          <H2>Collaboration</H2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3 mr-1" />
            New Handoff
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Grid className="border-b lg:!grid-cols-5">
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-2xl font-bold font-mondwest">{stats.total}</span>
        </Cell>
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Pending</span>
          <span className="text-2xl font-bold font-mondwest text-warning">{stats.pending}</span>
        </Cell>
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">In Progress</span>
          <span className="text-2xl font-bold font-mondwest text-info">{stats.in_progress}</span>
        </Cell>
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Completed</span>
          <span className="text-2xl font-bold font-mondwest text-success">{stats.completed}</span>
        </Cell>
        <Cell className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Failed</span>
          <span className="text-2xl font-bold font-mondwest text-destructive">{stats.failed}</span>
        </Cell>
      </Grid>

      {/* New handoff form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4" />
              Create Handoff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  From Session (optional)
                </label>
                <Input
                  placeholder="session-id or 'dashboard'"
                  value={fromSession}
                  onChange={(e) => setFromSession(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-9 bg-card border border-border text-xs px-3"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Task *</label>
              <Input
                placeholder="What should the agent do?"
                value={task}
                onChange={(e) => setTask(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Context (optional)
              </label>
              <Input
                placeholder="Additional context for the receiving agent"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={!task.trim() || submitting}>
                {submitting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3 mr-1" />
                )}
                Spawn Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graph + List layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Graph */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Collaboration Graph
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CollabGraphView graph={graph} />
          </CardContent>
        </Card>

        {/* Handoff list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Handoffs
              </CardTitle>
              <div className="flex gap-1">
                {["all", "pending", "in_progress", "completed", "failed"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[10px] px-2 py-1 border transition-colors ${
                      filter === f ? "border-primary text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {f.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No handoffs found
              </p>
            )}
            {filtered.map((h) => (
              <HandoffCard
                key={h.id}
                handoff={h}
                onAccept={handleAccept}
                onComplete={handleComplete}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
