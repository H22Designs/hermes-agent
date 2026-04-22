# Hermes Mission Control

**An enhanced dashboard and operations layer for [Hermes Agent](https://github.com/NousResearch/hermes-agent).**

Mission Control adds real-time monitoring, system resource tracking, agent collaboration, a command palette, and a customizable widget-based home screen on top of the stock Hermes web dashboard. It does not replace or modify the stock dashboard — it extends it. All original pages, routes, and functionality remain intact.

---

## Table of Contents

- [What's New](#whats-new)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
  - [Command Palette](#command-palette)
  - [Sidebar Navigation](#sidebar-navigation)
  - [Home Dashboard](#home-dashboard)
  - [Live Monitor](#live-monitor)
  - [Resource Usage](#resource-usage)
  - [Collaboration](#collaboration)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## What's New

### Navigation Overhaul

| Feature | Description |
|---------|-------------|
| **Command Palette** | Press `Ctrl+K` (or `Cmd+K` on Mac) to search and navigate to any page instantly. Shows favorites and recent pages. |
| **Grouped Sidebar** | Pages organized into 5 collapsible sections: Home, Operations, Infrastructure, Management, Config. |
| **Favorites** | Star any page to pin it to the top of the sidebar. Works from sidebar or command palette. |
| **Collapsible Sidebar** | Click the panel icon to collapse to icon-only mode. Click again to expand. |
| **Persistent State** | Sidebar collapsed state, section collapsed state, favorites, and recent pages all persist across sessions via localStorage. |

### New Pages

| Page | Path | Description |
|------|------|-------------|
| **Home Dashboard** | `/` | Customizable widget-based overview. Toggle widgets on/off. |
| **Live Monitor** | `/monitor` | Real-time SSE stream of all active agent sessions. Shows tool calls, errors, session join/leave events. |
| **Resource Usage** | `/resources` | Live CPU, memory, disk, and network metrics with sparkline history and per-core breakdown. |
| **Collaboration** | `/collaboration` | Agent-to-agent task handoffs. Create tasks, spawn subagents, track handoff lifecycle, visualize collaboration graph. |

### New Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/metrics` | GET | Current CPU, memory, disk, network, and top-process metrics. |
| `/api/system/metrics/history` | GET | CPU/memory history for the last N seconds (ring buffer, up to 1 hour). |
| `/api/monitor/sessions` | GET | All active sessions with live agent status (current tool, iteration, error). |
| `/api/monitor/stream` | GET | SSE endpoint — streams real-time events from all active agent sessions. |
| `/api/collaboration/handoff` | POST | Create a task handoff between agents or spawn a new agent for a task. |
| `/api/collaboration/handoffs` | GET | List all handoff records, optionally filtered by status. |
| `/api/collaboration/handoffs/{id}/accept` | POST | Accept a pending handoff. |
| `/api/collaboration/handoffs/{id}/complete` | POST | Mark a handoff as completed. |
| `/api/collaboration/graph` | GET | Returns nodes and edges for the collaboration graph visualization. |

---

## Installation

Mission Control is designed to be installed on top of an existing Hermes Agent installation. It does not overwrite your config, sessions, skills, or any user data.

### Prerequisites

- Hermes Agent already installed and working
- Python 3.11+ with pip or uv
- Node.js 18+ (for the frontend build)
- `psutil` Python package

### Step 1: Install psutil

```bash
# If using a venv:
cd ~/.hermes/hermes-agent
source venv/bin/activate
pip install psutil

# Or with uv:
uv pip install psutil --python venv/bin/python3
```

If your venv doesn't have pip:

```bash
# Option A: Use uv
uv pip install psutil --python ~/.hermes/hermes-agent/venv/bin/python3

# Option B: Use system pip targeting the venv
pip3 install psutil --target ~/.hermes/hermes-agent/venv/lib/python3.11/site-packages/
```

### Step 2: Apply Backend Changes

The new endpoints are added to the end of `hermes_cli/web_server.py`, just before the `_mount_plugin_api_routes()` call. The changes are:

1. **New import** — `import psutil` near the top of the new endpoints section
2. **New globals** — `_handoffs` list and `_handoffs_lock` for collaboration state
3. **Public path** — `/api/monitor/stream` added to `_PUBLIC_API_PATHS` (EventSource can't send auth headers)
4. **11 new endpoints** — system metrics, monitor sessions/stream, collaboration handoffs/graph

To apply non-destructively, patch the file:

```bash
cd ~/.hermes/hermes-agent

# Backup first
cp hermes_cli/web_server.py hermes_cli/web_server.py.bak

# The changes are already in the file if you've pulled from our branch.
# To verify the endpoints exist:
python -c "
from hermes_cli.web_server import app
for r in app.routes:
    if hasattr(r, 'path') and any(x in r.path for x in ['system', 'monitor', 'collab']):
        print(r.path)
"
```

Expected output:
```
/api/system/metrics
/api/system/metrics/history
/api/monitor/sessions
/api/monitor/stream
/api/collaboration/handoff
/api/collaboration/handoffs
/api/collaboration/handoffs/{handoff_id}/accept
/api/collaboration/handoffs/{handoff_id}/complete
/api/collaboration/graph
```

### Step 3: Build Frontend

```bash
cd ~/.hermes/hermes-agent/web
npm run build
```

This compiles the new pages and updated layout into `hermes_cli/web_dist/`.

### Step 4: Restart Dashboard

```bash
# Kill existing dashboard
kill $(lsof -ti:9119)

# Start fresh
cd ~/.hermes/hermes-agent
source venv/bin/activate
python -m hermes_cli.main dashboard --host 0.0.0.0 --port 9119 --insecure
```

Or if you start it programmatically:

```python
from hermes_cli.web_server import start_server
start_server(host="0.0.0.0", port=9119, allow_public=True, open_browser=False)
```

### Step 5: Verify

Open your browser and navigate to `http://localhost:9119`. You should see:

- The new sidebar with grouped sections
- The home dashboard with widgets
- `Ctrl+K` should open the command palette

Hard refresh (`Ctrl+Shift+R`) if you see the old UI — your browser may have cached the old assets.

### Rollback

If something goes wrong, restore the backup:

```bash
cd ~/.hermes/hermes-agent
cp hermes_cli/web_server.py.bak hermes_cli/web_server.py
npm run build  # in web/
# Restart dashboard
```

No database migrations, no config changes, no data loss.

---

## Usage Guide

### Command Palette

**Open:** `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)

**What it does:**
- Searches across all 20 dashboard pages by name, keywords, and group
- Shows favorites (starred pages) when no query is entered
- Shows recent pages when no favorites exist
- Arrow keys to navigate results, Enter to open
- Star/unstar pages directly from the results

**Tips:**
- Type "cpu" to jump to Resources
- Type "telegram" to jump to Gateway
- Type "board" to jump to Boards
- Type "key" to jump to API Keys

### Sidebar Navigation

**Groups:**

| Section | Pages |
|---------|-------|
| **Home** | Overview, Dashboard |
| **Operations** | Live Monitor, Sessions, Agent Chat, Agents |
| **Infrastructure** | Resources, Gateway, Status, Logs |
| **Management** | Boards, Approvals, Cron Jobs, Skills, Marketplace, Collaboration |
| **Config** | Analytics, Activity, Settings, API Keys |

**Actions:**
- Click a section header to collapse/expand it
- Click the star icon next to any page to favorite it
- Click the panel icon (top-right of sidebar) to collapse to icon-only mode
- In collapsed mode, click icons to navigate; click the expand button to restore

### Home Dashboard

The home page (`/`) shows a customizable set of widgets:

| Widget | Description | Refresh |
|--------|-------------|---------|
| **System Health** | CPU, RAM, and disk usage bars with color-coded thresholds | 5s |
| **Gateway** | Gateway running status and platform connection states | 10s |
| **Active Sessions** | List of live sessions with model, message count, and agent status | 5s |
| **Quick Actions** | 6-button grid for common navigation targets | Static |
| **Collaboration** | Pending/active/completed handoff counts | On load |

**Customize:**
1. Click the "Customize" button in the top-right
2. Toggle widgets on/off with the buttons
3. Click "Done" to save
4. State persists in localStorage

### Live Monitor

**Path:** `/monitor`

Real-time monitoring of all active agent sessions via Server-Sent Events (SSE).

**Layout:**
- **Left panel:** List of active sessions with model, token usage, current tool, and status
- **Right panel:** Live event stream showing tool calls, completions, errors, and session events

**Features:**
- SSE connection indicator (green = connected, red = disconnected)
- Auto-reconnect on disconnect (3-second retry)
- Session join/leave notifications
- Tool call timing (duration shown on completion)
- Summary cards: active sessions, running agents, total tool calls, total tokens

**Events shown:**
- `session_join` — A new agent session started
- `tool_start` — An agent began executing a tool
- `tool_complete` — A tool finished (with duration)
- `error` — An agent encountered an error
- `session_leave` — An agent session ended
- `heartbeat` — Connection keepalive (not displayed)

### Resource Usage

**Path:** `/resources`

Live system metrics dashboard.

**Metrics:**
- **CPU:** Overall percentage, per-core bar chart, load averages (1/5/15 min), sparkline history
- **Memory:** Used/total with progress bar, swap usage, available memory, sparkline history
- **Disk:** All mountpoints with device, filesystem type, and usage bars
- **Network:** Total bytes sent/received with live rate (bytes/sec)
- **Top Processes:** Top 8 processes by CPU and memory usage

**Refresh rate:** 3 seconds

**Color coding:**
- Green: < 70% usage
- Yellow/Orange: 70-90% usage
- Red: > 90% usage

### Collaboration

**Path:** `/collaboration`

Agent-to-agent task delegation and handoff system.

**Creating a handoff:**
1. Click "New Handoff"
2. Fill in:
   - **From Session** (optional) — The session delegating the task
   - **Priority** — Low, Normal, High, Urgent
   - **Task** (required) — What the receiving agent should do
   - **Context** (optional) — Additional background information
3. Click "Spawn Agent"
4. A new agent thread is created automatically to execute the task

**Handoff lifecycle:**
```
pending → in_progress → completed
                    ↘ failed
```

**Handoff cards show:**
- Status icon and badge
- Task description
- Source and destination session IDs
- Priority level
- Created/completed timestamps
- Accept/Complete action buttons

**Collaboration Graph:**
- SVG visualization of agent-to-agent connections
- Nodes represent sessions, edges represent handoffs
- Edge colors indicate status (green = completed, red = failed, blue = in progress)
- Node labels show handoff counts (outgoing →, incoming ←)

**Filtering:**
- Filter handoffs by status: All, Pending, In Progress, Completed, Failed

---

## Configuration

Mission Control uses the existing Hermes configuration. No new config keys are required.

**Relevant settings:**

| Config Key | Effect |
|------------|--------|
| `display.theme` | Dashboard theme (default, midnight, ember, mono, cyberpunk, rose) |
| `display.skin` | CLI skin (doesn't affect web UI) |

**localStorage keys used by Mission Control:**

| Key | Purpose |
|-----|---------|
| `hermes-sidebar-state` | Sidebar expanded/collapsed |
| `hermes-sidebar-collapsed` | Which sidebar sections are collapsed |
| `hermes-favorites` | Starred pages for quick access |
| `hermes-recent-pages` | Last 8 visited pages |
| `hermes-home-widgets` | Which home dashboard widgets are visible |

Clear these keys to reset Mission Control to defaults.

---

## API Reference

### System Metrics

```
GET /api/system/metrics
```

Returns current system resource usage. Requires auth token.

**Response:**
```json
{
  "timestamp": 1776816497.83,
  "cpu": {
    "percent": 5.2,
    "count": 56,
    "per_core": [11.1, 0.0, ...],
    "load_avg": {"1m": 4.59, "5m": 5.67, "15m": 5.16}
  },
  "memory": {
    "total": 134217728000,
    "available": 69793218560,
    "used": 63198085120,
    "percent": 47.1,
    "swap_total": 8589934592,
    "swap_used": 0,
    "swap_percent": 0.0
  },
  "disks": [
    {
      "device": "/dev/mapper/pve-root",
      "mountpoint": "/",
      "fstype": "ext4",
      "total": 255587614720,
      "used": 106300440576,
      "free": 136287981568,
      "percent": 44.0
    }
  ],
  "network": {
    "bytes_sent": 1234567890,
    "bytes_recv": 9876543210,
    "packets_sent": 1234567,
    "packets_recv": 9876543
  },
  "top_processes": [
    {"pid": 1234, "name": "python", "cpu_percent": 15.2, "memory_percent": 3.1}
  ]
}
```

```
GET /api/system/metrics/history?seconds=300
```

Returns CPU/memory history samples. Ring buffer, max 3600 seconds.

### Monitor

```
GET /api/monitor/sessions
```

Returns all active sessions with agent status. Requires auth token.

```
GET /api/monitor/stream
```

SSE endpoint — streams events from all active agent sessions. No auth required (public endpoint because EventSource doesn't support custom headers).

### Collaboration

```
POST /api/collaboration/handoff
Content-Type: application/json

{
  "from_session": "dashboard",
  "task": "Analyze the error logs and summarize findings",
  "context": "Focus on the last 24 hours",
  "priority": "high"
}
```

Creates a handoff. If `to_session` is omitted, a new agent is spawned automatically.

```
GET /api/collaboration/handoffs?status=pending
```

List handoffs, optionally filtered by status.

```
GET /api/collaboration/graph
```

Returns nodes and edges for the collaboration graph visualization.

---

## Troubleshooting

### Dashboard shows old UI

**Fix:** Hard refresh your browser (`Ctrl+Shift+R` or `Cmd+Shift+R`). The browser cached the old assets.

### "Disconnected" on Live Monitor

**Causes:**
1. Dashboard server not restarted after applying changes
2. `/api/monitor/stream` not in `_PUBLIC_API_PATHS` (returns 401)
3. No active sessions to monitor (SSE stays idle until events arrive)

**Fix:**
```bash
# Verify the endpoint is public
grep "monitor/stream" ~/.hermes/hermes-agent/hermes_cli/web_server.py

# Verify it responds
curl -sN http://localhost:9119/api/monitor/stream
# Should hang (waiting for events) — not return 401
```

### Resource page never loads

**Causes:**
1. `psutil` not installed in the venv
2. Auth token mismatch (old browser tab, new server)

**Fix:**
```bash
# Install psutil
cd ~/.hermes/hermes-agent
source venv/bin/activate
pip install psutil

# Verify
python -c "import psutil; print(psutil.__version__)"

# Hard refresh browser
```

### Collaboration page is blank

**Causes:**
1. API endpoints returning 401 (auth mismatch)
2. `fetchJSON` not being used (missing auth header)

**Fix:** Verify the endpoints work:
```bash
TOKEN=$(curl -s http://localhost:9119/ | grep -oP '__HERMES_SESSION_TOKEN__="\K[^"]+')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9119/api/collaboration/handoffs
# Should return: {"handoffs":[]}
```

### 500 Internal Server Error on /api/monitor/sessions

**Cause:** `SessionDB` method name mismatch — the code calls `list_sessions()` but the correct method is `list_sessions_rich()`.

**Fix:** Already fixed in this version. If you see this error, verify:
```bash
grep "list_sessions" ~/.hermes/hermes-agent/hermes_cli/web_server.py | grep -v "rich"
# Should return nothing (all calls should use list_sessions_rich)
```

### Command Palette doesn't open

**Fix:** Make sure you're pressing `Ctrl+K` (not `Cmd+K` on Linux). On Mac, use `Cmd+K`.

### Widgets not saving state

**Cause:** localStorage disabled or full.

**Fix:** Check browser settings → Privacy → ensure "Cookies and site data" is allowed. Clear old localStorage entries if full.

---

## File Manifest

### New files

```
web/src/components/CommandPalette.tsx    — Command palette (Ctrl+K)
web/src/components/Sidebar.tsx           — New grouped sidebar
web/src/pages/HomeDashboard.tsx          — Widget-based home page
web/src/pages/LiveMonitorPage.tsx        — Real-time agent monitoring
web/src/pages/ResourceUsagePage.tsx      — System resource dashboard
web/src/pages/CollaborationPage.tsx      — Agent handoff/collaboration
```

### Modified files

```
hermes_cli/web_server.py                 — 11 new endpoints, psutil import, public paths
web/src/App.tsx                          — New unified sidebar layout, routes
web/src/lib/api.ts                       — New types and API methods
```

### Unchanged files

```
All existing pages (DashboardPage, SessionsPage, AgentsPage, etc.)
All existing components (ThemeSwitcher, LanguageSwitcher, etc.)
All existing backend endpoints
All config files
All user data (sessions, skills, memory, env)
```

---

## License

Same as [Hermes Agent](https://github.com/NousResearch/hermes-agent) — MIT.
