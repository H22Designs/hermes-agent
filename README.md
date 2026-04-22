# Hermes Mission Control

**An enhanced dashboard for [Hermes Agent](https://github.com/NousResearch/hermes-agent) — live monitoring, system resources, agent collaboration, and a command palette.**

> Built on top of the stock Hermes web dashboard. All original pages and functionality remain. This adds new pages, a new navigation system, and real-time operations tooling.

---

## What is this?

Mission Control extends the Hermes Agent web dashboard with features the stock dashboard doesn't have:

| Feature | Stock Dashboard | Mission Control |
|---------|:-:|:-:|
| Session list | ✅ | ✅ |
| Config editor | ✅ | ✅ |
| Cron management | ✅ | ✅ |
| Skills marketplace | ✅ | ✅ |
| **Live agent monitoring (SSE)** | ❌ | ✅ |
| **System resource metrics** | ❌ | ✅ |
| **Agent-to-agent collaboration** | ❌ | ✅ |
| **Command palette (Ctrl+K)** | ❌ | ✅ |
| **Grouped sidebar with favorites** | ❌ | ✅ |
| **Customizable widget home** | ❌ | ✅ |

---

## Screenshots

The new home dashboard shows system health, active sessions, gateway status, and quick actions — all in customizable widgets.

The command palette (`Ctrl+K`) lets you jump to any page instantly:

```
┌─────────────────────────────────────────────┐
│ 🔍 Search pages, sessions, skills...    ESC │
├─────────────────────────────────────────────┤
│ ⭐ Favorites                                │
│ → Live Monitor              Operations      │
│ → Resources                 Infrastructure  │
│                                               │
│ 🕐 Recent                                   │
│ → Settings                  Config           │
│ → Sessions                  Operations       │
├─────────────────────────────────────────────┤
│ ↑↓ navigate  ↵ open              ⌘K toggle │
└─────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) already installed
- Python 3.11+
- Node.js 18+
- `psutil` Python package

### 1. Install psutil

```bash
cd ~/.hermes/hermes-agent
source venv/bin/activate
pip install psutil
```

### 2. Clone this repo (or pull the feature branch)

```bash
git clone https://github.com/H22Designs/hermes-agent.git
cd hermes-agent
git checkout feat/mission-control
```

### 3. Build the frontend

```bash
cd web
npm install
npm run build
```

### 4. Start the dashboard

```bash
cd ..
source venv/bin/activate
python -m hermes_cli.main dashboard --host 0.0.0.0 --port 9119 --insecure
```

### 5. Open in browser

Go to `http://localhost:9119`. You should see the new sidebar and home dashboard. Press `Ctrl+K` to open the command palette.

---

## Features

### Command Palette

Press `Ctrl+K` (or `Cmd+K` on Mac) from anywhere to search and navigate.

- Searches all 20 pages by name, keywords, and category
- Shows starred favorites when empty
- Shows recently visited pages
- Star pages directly from search results
- Arrow keys + Enter to navigate

### Grouped Sidebar

Pages are organized into 5 collapsible sections:

- **Home** — Overview, Dashboard
- **Operations** — Live Monitor, Sessions, Agent Chat, Agents
- **Infrastructure** — Resources, Gateway, Status, Logs
- **Management** — Boards, Approvals, Cron, Skills, Marketplace, Collaboration
- **Config** — Analytics, Activity, Settings, API Keys

Click any section header to collapse/expand. Star pages to pin them above the groups.

### Home Dashboard

A customizable widget-based overview at `/`:

| Widget | What it shows |
|--------|--------------|
| **System Health** | CPU, RAM, disk usage bars (auto-refresh 5s) |
| **Gateway** | Running status + platform connections |
| **Active Sessions** | Live agent sessions with status |
| **Quick Actions** | 6-button grid for common navigation |
| **Collaboration** | Pending/active/completed handoff counts |

Click "Customize" to toggle widgets on/off. State persists in localStorage.

### Live Monitor

Real-time monitoring at `/connect` using Server-Sent Events:

- See all active agent sessions in one place
- Watch tool calls stream in live
- See tool duration, errors, and session lifecycle events
- Auto-reconnects on disconnect

### Resource Usage

Live system metrics at `/resources`:

- **CPU** — overall %, per-core bars, load averages, sparkline history
- **Memory** — used/total, swap, sparkline history
- **Disk** — all mountpoints with usage bars
- **Network** — total bytes + live throughput rate
- **Top Processes** — by CPU and memory usage

Refreshes every 3 seconds.

### Collaboration

Agent-to-agent task delegation at `/collaboration`:

1. Click "New Handoff"
2. Write a task description and optional context
3. Click "Spawn Agent"
4. A new agent thread is created to execute the task
5. Track the handoff through its lifecycle: pending → in_progress → completed

Includes a visual graph of agent-to-agent connections.

---

## Installation on Existing Hermes

Mission Control is designed to be installed **on top of** an existing Hermes installation. It does not:

- Modify your `config.yaml`
- Change your sessions, skills, or memory
- Alter any existing dashboard pages
- Require database migrations

### What it changes

| File | What changed |
|------|-------------|
| `hermes_cli/web_server.py` | 11 new API endpoints added at the end |
| `web/src/App.tsx` | New layout with sidebar |
| `web/src/lib/api.ts` | New types and API methods |
| `web/src/components/` | 2 new components (CommandPalette, Sidebar) |
| `web/src/pages/` | 4 new pages (Home, Monitor, Resources, Collaboration) |

### Rollback

If you need to revert:

```bash
cd ~/.hermes/hermes-agent
git checkout main
cd web && npm run build
# Restart dashboard
```

No data is lost. The stock dashboard works exactly as before.

---

## New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/metrics` | GET | CPU, memory, disk, network, top processes |
| `/api/system/metrics/history` | GET | CPU/memory sparkline data (up to 1hr) |
| `/api/monitor/sessions` | GET | Active sessions with agent status |
| `/api/monitor/stream` | GET | SSE stream of all agent events |
| `/api/collaboration/handoff` | POST | Create a task handoff |
| `/api/collaboration/handoffs` | GET | List all handoffs |
| `/api/collaboration/handoffs/{id}/accept` | POST | Accept a handoff |
| `/api/collaboration/handoffs/{id}/complete` | POST | Complete a handoff |
| `/api/collaboration/graph` | GET | Collaboration graph data |

See [MISSION_CONTROL.md](MISSION_CONTROL.md) for full API reference with request/response examples.

---

## Pages

| Path | Page | New? |
|------|------|:----:|
| `/` | Home Dashboard (widgets) | ✅ |
| `/dashboard` | Classic Dashboard | |
| `/monitor` | Live Monitor (SSE) | ✅ |
| `/resources` | CPU/RAM/Disk/Network | ✅ |
| `/sessions` | Session history | |
| `/chat` | Agent Chat | |
| `/agents` | Spawn/manage agents | |
| `/gateway` | Platform connections | |
| `/status` | System status | |
| `/logs` | Log viewer | |
| `/boards` | Kanban boards | |
| `/approvals` | Pending approvals | |
| `/cron` | Scheduled jobs | |
| `/skills` | Installed skills | |
| `/marketplace` | Browse/install skills | |
| `/collaboration` | Agent handoffs | ✅ |
| `/analytics` | Token/cost usage | |
| `/activity` | Event feed | |
| `/config` | Settings | |
| `/env` | API keys | |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `↑` / `↓` | Navigate palette results |
| `Enter` | Open selected page |
| `Escape` | Close command palette |

---

## Documentation

- **[MISSION_CONTROL.md](MISSION_CONTROL.md)** — Full documentation: installation, usage, API reference, troubleshooting
- **[MISSION_CONTROL_QUICKREF.md](MISSION_CONTROL_QUICKREF.md)** — Quick reference card
- **[README_UPSTREAM.md](README_UPSTREAM.md)** — Original Hermes Agent README from Nous Research

---

## Based on

This project extends [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research. The stock dashboard, backend, and core agent functionality are their work. Mission Control adds the operations layer on top.

## License

MIT — same as upstream Hermes Agent.
