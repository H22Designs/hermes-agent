# Mission Control — Quick Reference

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `↑` / `↓` | Navigate palette results |
| `Enter` | Open selected page |
| `Escape` | Close command palette |

## Pages

| URL | Page |
|-----|------|
| `/` | Home Dashboard (widgets) |
| `/dashboard` | Classic Dashboard |
| `/monitor` | Live Monitor (SSE) |
| `/resources` | CPU/RAM/Disk/Network |
| `/sessions` | Session history |
| `/chat` | Agent Chat |
| `/agents` | Spawn/manage agents |
| `/gateway` | Platform connections |
| `/status` | System status |
| `/logs` | Log viewer |
| `/boards` | Kanban boards |
| `/approvals` | Pending approvals |
| `/cron` | Scheduled jobs |
| `/skills` | Installed skills |
| `/marketplace` | Browse/install skills |
| `/collaboration` | Agent handoffs |
| `/analytics` | Token/cost usage |
| `/activity` | Event feed |
| `/config` | Settings |
| `/env` | API keys |

## CLI Commands

```bash
# Start dashboard
hermes dashboard --host 0.0.0.0 --port 9119 --insecure

# Build frontend (after changes)
cd ~/.hermes/hermes-agent/web && npm run build

# Install psutil dependency
source venv/bin/activate && pip install psutil

# Test endpoints
TOKEN=$(curl -s http://localhost:9119/ | grep -oP '__HERMES_SESSION_TOKEN__="\K[^"]+')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9119/api/system/metrics
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9119/api/monitor/sessions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9119/api/collaboration/handoffs
curl -sN http://localhost:9119/api/monitor/stream  # SSE (no auth needed)
```

## Widget IDs (for localStorage customization)

| ID | Widget |
|----|--------|
| `system` | System Health |
| `gateway` | Gateway Status |
| `sessions` | Active Sessions |
| `actions` | Quick Actions |
| `collab` | Collaboration Summary |

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `hermes-sidebar-state` | `expanded` / `collapsed` |
| `hermes-sidebar-collapsed` | JSON of collapsed group IDs |
| `hermes-favorites` | JSON array of favorited paths |
| `hermes-recent-pages` | JSON array of recent paths |
| `hermes-home-widgets` | JSON of widget visibility state |
