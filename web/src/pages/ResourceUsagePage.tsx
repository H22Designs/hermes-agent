import { useEffect, useState, useRef, useCallback } from "react";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  Server,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Cell, Grid, H2 } from "@nous-research/ui";
import { fetchJSON } from "@/lib/api";
import type { SystemMetrics, MetricsHistory } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Helpers ───────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatRate(bytesPerSec: number): string {
  if (bytesPerSec >= 1_073_741_824) return `${(bytesPerSec / 1_073_741_824).toFixed(1)} GB/s`;
  if (bytesPerSec >= 1_048_576) return `${(bytesPerSec / 1_048_576).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1_024) return `${(bytesPerSec / 1_024).toFixed(0)} KB/s`;
  return `${bytesPerSec.toFixed(0)} B/s`;
}

function percentColor(pct: number): string {
  if (pct >= 90) return "text-destructive";
  if (pct >= 70) return "text-warning";
  return "text-success";
}

function percentBarColor(pct: number): string {
  if (pct >= 90) return "bg-destructive";
  if (pct >= 70) return "bg-warning";
  return "bg-success";
}

// ── Sparkline component ───────────────────────────────────────────

function Sparkline({
  data,
  height = 40,
  color = "currentColor",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return <div style={{ height }} />;

  const max = Math.max(...data, 1);
  const width = 100;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${height - (v / max) * (height - 4)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────────────

function UsageBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={percentColor(percent)}>{percent.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${percentBarColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function ResourceUsagePage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<MetricsHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastNetwork, setLastNetwork] = useState<{
    sent: number;
    recv: number;
    ts: number;
  } | null>(null);
  const [netRate, setNetRate] = useState({ sent: 0, recv: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      const [m, h] = await Promise.all([
        fetchJSON<SystemMetrics>("/api/system/metrics"),
        fetchJSON<MetricsHistory>("/api/system/metrics/history?seconds=120"),
      ]);

      // Calculate network rate
      if (lastNetwork) {
        const dt = m.timestamp - lastNetwork.ts;
        if (dt > 0) {
          setNetRate({
            sent: (m.network.bytes_sent - lastNetwork.sent) / dt,
            recv: (m.network.bytes_recv - lastNetwork.recv) / dt,
          });
        }
      }
      setLastNetwork({
        sent: m.network.bytes_sent,
        recv: m.network.bytes_recv,
        ts: m.timestamp,
      });

      setMetrics(m);
      setHistory(h);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [lastNetwork]);

  useEffect(() => {
    loadMetrics();
    intervalRef.current = setInterval(loadMetrics, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cpuSamples = history?.samples.map((s) => s.cpu) || [];
  const memSamples = history?.samples.map((s) => s.mem) || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <H2>Resource Usage</H2>
          <Badge variant="outline" className="text-[10px]">
            Auto-refresh 3s
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadMetrics}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* CPU + Memory overview */}
      <Grid className="border-b lg:!grid-cols-2">
        {/* CPU */}
        <Cell className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">CPU</span>
            <span className={`text-2xl font-bold font-mondwest ml-auto ${percentColor(metrics.cpu.percent)}`}>
              {metrics.cpu.percent.toFixed(1)}%
            </span>
          </div>
          <Sparkline data={cpuSamples} height={50} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Cores:</span>{" "}
              <span className="font-mono">{metrics.cpu.count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Load:</span>{" "}
              <span className="font-mono">
                {metrics.cpu.load_avg["1m"].toFixed(2)} / {metrics.cpu.load_avg["5m"].toFixed(2)} / {metrics.cpu.load_avg["15m"].toFixed(2)}
              </span>
            </div>
          </div>
          {/* Per-core bars */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Per-core</span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {metrics.cpu.per_core.map((pct, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="h-8 w-full bg-muted rounded-sm overflow-hidden flex flex-col-reverse">
                    <div
                      className={`w-full transition-all duration-500 ${percentBarColor(pct)}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{i}</span>
                </div>
              ))}
            </div>
          </div>
        </Cell>

        {/* Memory */}
        <Cell className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4 text-info" />
            <span className="text-sm font-medium">Memory</span>
            <span className={`text-2xl font-bold font-mondwest ml-auto ${percentColor(metrics.memory.percent)}`}>
              {metrics.memory.percent.toFixed(1)}%
            </span>
          </div>
          <Sparkline data={memSamples} height={50} />
          <UsageBar
            percent={metrics.memory.percent}
            label={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
          />
          {metrics.memory.swap_total > 0 && (
            <UsageBar
              percent={metrics.memory.swap_percent}
              label={`Swap: ${formatBytes(metrics.memory.swap_used)} / ${formatBytes(metrics.memory.swap_total)}`}
            />
          )}
          <div className="text-xs text-muted-foreground">
            Available: {formatBytes(metrics.memory.available)}
          </div>
        </Cell>
      </Grid>

      {/* Disks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Disk Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {metrics.disks.map((d) => (
            <div key={d.mountpoint} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono truncate" title={d.mountpoint}>
                  {d.device} → {d.mountpoint}
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {d.fstype}
                </Badge>
              </div>
              <UsageBar
                percent={d.percent}
                label={`${formatBytes(d.used)} / ${formatBytes(d.total)}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Network + Top Processes */}
      <Grid className="border-b lg:!grid-cols-2">
        {/* Network */}
        <Cell>
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="h-4 w-4" />
                Network
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-muted-foreground mb-1">Sent</div>
                  <div className="font-mono text-lg">{formatBytes(metrics.network.bytes_sent)}</div>
                  <div className="text-muted-foreground">{formatRate(netRate.sent)}/s</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Received</div>
                  <div className="font-mono text-lg">{formatBytes(metrics.network.bytes_recv)}</div>
                  <div className="text-muted-foreground">{formatRate(netRate.recv)}/s</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Packets: {metrics.network.packets_sent.toLocaleString()} out / {metrics.network.packets_recv.toLocaleString()} in
              </div>
            </CardContent>
          </Card>
        </Cell>

        {/* Top Processes */}
        <Cell>
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                Top Processes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {metrics.top_processes.slice(0, 8).map((p) => (
                  <div
                    key={p.pid}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-mono truncate max-w-[140px]" title={p.name}>
                      {p.name}
                    </span>
                    <div className="flex gap-4 text-muted-foreground">
                      <span className="w-12 text-right">{p.cpu_percent?.toFixed(1)}% CPU</span>
                      <span className="w-12 text-right">{p.memory_percent?.toFixed(1)}% MEM</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Cell>
      </Grid>
    </div>
  );
}
