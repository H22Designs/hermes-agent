import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Command, ArrowRight, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Page registry for search ──────────────────────────────────────

interface PageEntry {
  path: string;
  label: string;
  keywords: string[];
  icon: string; // icon name for resolveIcon
  group: string;
}

const ALL_PAGES: PageEntry[] = [
  { path: "/", label: "Home", keywords: ["dashboard", "home", "overview"], icon: "LayoutGrid", group: "Home" },
  { path: "/dashboard", label: "Dashboard", keywords: ["metrics", "stats", "overview"], icon: "LayoutGrid", group: "Home" },
  { path: "/monitor", label: "Live Monitor", keywords: ["live", "real-time", "streaming", "agents"], icon: "Eye", group: "Operations" },
  { path: "/sessions", label: "Sessions", keywords: ["history", "conversations", "chat"], icon: "MessageSquare", group: "Operations" },
  { path: "/chat", label: "Agent Chat", keywords: ["talk", "message", "conversation"], icon: "MessageSquare", group: "Operations" },
  { path: "/agents", label: "Agents", keywords: ["spawn", "subagent", "worker"], icon: "Bot", group: "Operations" },
  { path: "/resources", label: "Resources", keywords: ["cpu", "memory", "ram", "disk", "system", "monitoring"], icon: "TrendingUp", group: "Infrastructure" },
  { path: "/gateway", label: "Gateway", keywords: ["telegram", "discord", "slack", "platform"], icon: "Radio", group: "Infrastructure" },
  { path: "/status", label: "Status", keywords: ["health", "version", "info"], icon: "Activity", group: "Infrastructure" },
  { path: "/logs", label: "Logs", keywords: ["debug", "errors", "output"], icon: "FileText", group: "Infrastructure" },
  { path: "/boards", label: "Boards", keywords: ["kanban", "tasks", "project", "todo"], icon: "LayoutGrid", group: "Management" },
  { path: "/approvals", label: "Approvals", keywords: ["permissions", "review", "authorize"], icon: "Shield", group: "Management" },
  { path: "/cron", label: "Cron Jobs", keywords: ["schedule", "recurring", "automation"], icon: "Clock", group: "Management" },
  { path: "/skills", label: "Skills", keywords: ["tools", "abilities", "plugins"], icon: "Package", group: "Management" },
  { path: "/marketplace", label: "Marketplace", keywords: ["install", "browse", "discover"], icon: "Sparkles", group: "Management" },
  { path: "/collaboration", label: "Collaboration", keywords: ["handoff", "team", "agent-to-agent"], icon: "Users", group: "Management" },
  { path: "/analytics", label: "Analytics", keywords: ["usage", "tokens", "cost", "stats"], icon: "BarChart3", group: "Config" },
  { path: "/activity", label: "Activity", keywords: ["events", "feed", "history"], icon: "Activity", group: "Config" },
  { path: "/config", label: "Settings", keywords: ["config", "preferences", "options"], icon: "Settings", group: "Config" },
  { path: "/env", label: "API Keys", keywords: ["secrets", "env", "environment", "tokens"], icon: "KeyRound", group: "Config" },
];

// ── Recent pages (persisted) ──────────────────────────────────────

function getRecentPages(): string[] {
  try {
    return JSON.parse(localStorage.getItem("hermes-recent-pages") || "[]");
  } catch {
    return [];
  }
}

function addRecentPage(path: string) {
  const recent = getRecentPages().filter((p) => p !== path);
  recent.unshift(path);
  localStorage.setItem("hermes-recent-pages", JSON.stringify(recent.slice(0, 8)));
}

// ── Favorites (persisted) ─────────────────────────────────────────

function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem("hermes-favorites") || "[]");
  } catch {
    return [];
  }
}

function toggleFavorite(path: string) {
  const favs = getFavorites();
  const next = favs.includes(path) ? favs.filter((p) => p !== path) : [...favs, path];
  localStorage.setItem("hermes-favorites", JSON.stringify(next));
  return next;
}

// ── Component ─────────────────────────────────────────────────────

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Track page visits
  useEffect(() => {
    if (location.pathname !== "/") {
      addRecentPage(location.pathname);
    }
  }, [location.pathname]);

  // Search logic
  const results = (() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Show favorites + recent when no query
      const recentPaths = getRecentPages();
      const favPages = favorites
        .map((p) => ALL_PAGES.find((pg) => pg.path === p))
        .filter(Boolean) as PageEntry[];
      const recentPages = recentPaths
        .filter((p) => !favorites.includes(p))
        .map((p) => ALL_PAGES.find((pg) => pg.path === p))
        .filter(Boolean) as PageEntry[];
      return [...favPages, ...recentPages].slice(0, 10);
    }
    return ALL_PAGES.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.includes(q)) ||
        p.group.toLowerCase().includes(q)
    );
  })();

  const handleSelect = useCallback(
    (path: string) => {
      addRecentPage(path);
      navigate(path);
      setOpen(false);
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      handleSelect(results[selectedIdx].path);
    }
  };

  const handleFavToggle = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setFavorites(toggleFavorite(path));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 bg-background border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            placeholder="Search pages, sessions, skills..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {!query && favorites.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" /> Favorites
            </div>
          )}
          {!query && getRecentPages().length > 0 && favorites.length === 0 && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Recent
            </div>
          )}
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}
          {results.map((page, i) => {
            const isFav = favorites.includes(page.path);
            return (
              <button
                key={page.path}
                onClick={() => handleSelect(page.path)}
                onMouseEnter={() => setSelectedIdx(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                  i === selectedIdx
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                <ArrowRight className="h-3 w-3 shrink-0 opacity-40" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{page.label}</div>
                  <div className="text-[10px] opacity-60">{page.group}</div>
                </div>
                <button
                  onClick={(e) => handleFavToggle(e, page.path)}
                  className={cn(
                    "p-1 transition-opacity",
                    isFav ? "opacity-100 text-warning" : "opacity-0 group-hover:opacity-50 hover:opacity-100"
                  )}
                  title={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star className="h-3 w-3" fill={isFav ? "currentColor" : "none"} />
                </button>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="border border-border px-1 font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="border border-border px-1 font-mono">↵</kbd> open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
