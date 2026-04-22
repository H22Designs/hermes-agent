import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  Package,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
  Search,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

// ── Navigation structure ──────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  keywords?: string[];
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    items: [
      { path: "/", label: "Overview", icon: LayoutGrid },
      { path: "/dashboard", label: "Dashboard", icon: Activity },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { path: "/monitor", label: "Live Monitor", icon: Eye },
      { path: "/sessions", label: "Sessions", icon: MessageSquare },
      { path: "/chat", label: "Agent Chat", icon: MessageSquare },
      { path: "/agents", label: "Agents", icon: Bot },
    ],
  },
  {
    id: "infra",
    label: "Infrastructure",
    items: [
      { path: "/resources", label: "Resources", icon: TrendingUp },
      { path: "/gateway", label: "Gateway", icon: Radio },
      { path: "/status", label: "Status", icon: Activity },
      { path: "/logs", label: "Logs", icon: FileText },
    ],
  },
  {
    id: "mgmt",
    label: "Management",
    items: [
      { path: "/boards", label: "Boards", icon: LayoutGrid },
      { path: "/approvals", label: "Approvals", icon: Shield },
      { path: "/cron", label: "Cron Jobs", icon: Clock },
      { path: "/skills", label: "Skills", icon: Package },
      { path: "/marketplace", label: "Marketplace", icon: Sparkles },
      { path: "/collaboration", label: "Collaboration", icon: Users },
    ],
  },
  {
    id: "config",
    label: "Config",
    items: [
      { path: "/analytics", label: "Analytics", icon: BarChart3 },
      { path: "/activity", label: "Activity", icon: Activity },
      { path: "/config", label: "Settings", icon: Settings },
      { path: "/env", label: "API Keys", icon: KeyRound },
    ],
  },
];

// ── Collapsed sections (persisted) ────────────────────────────────

function getCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem("hermes-sidebar-collapsed") || "{}");
  } catch {
    return {};
  }
}

function setCollapsed(state: Record<string, boolean>) {
  localStorage.setItem("hermes-sidebar-collapsed", JSON.stringify(state));
}

// ── Favorites (persisted) ─────────────────────────────────────────

function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem("hermes-favorites") || "[]");
  } catch {
    return [];
  }
}

function toggleFavorite(path: string): string[] {
  const favs = getFavorites();
  const next = favs.includes(path) ? favs.filter((p) => p !== path) : [...favs, path];
  localStorage.setItem("hermes-favorites", JSON.stringify(next));
  return next;
}

// ── Component ─────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCommandPalette: () => void;
}

export default function Sidebar({ collapsed, onToggle, onCommandPalette }: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(getCollapsed);
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const location = useLocation();

  const toggleGroup = (id: string) => {
    const next = { ...collapsedGroups, [id]: !collapsedGroups[id] };
    setCollapsedGroups(next);
    setCollapsed(next);
  };

  // Listen for favorite changes from command palette
  useEffect(() => {
    const interval = setInterval(() => {
      setFavorites(getFavorites());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFavToggle = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(toggleFavorite(path));
  };

  // All items for favorites lookup
  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const favItems = favorites
    .map((p) => allItems.find((i) => i.path === p))
    .filter(Boolean) as NavItem[];

  // ── Collapsed mode ──────────────────────────────────────────────

  if (collapsed) {
    return (
      <nav className="fixed left-0 top-0 bottom-0 z-40 w-12 bg-background-base/95 backdrop-blur-sm border-r border-current/20 flex flex-col items-center py-3 gap-1">
        {/* Expand button */}
        <button
          onClick={onToggle}
          className="p-2 opacity-40 hover:opacity-100 transition-opacity mb-2"
          title="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Home */}
        <NavLink
          to="/"
          title="Home"
          className={({ isActive }) =>
            cn("p-2 transition-colors", isActive ? "text-midground" : "opacity-40 hover:opacity-100")
          }
        >
          <LayoutGrid className="h-4 w-4" />
        </NavLink>

        <div className="w-6 border-t border-current/10 my-1" />

        {/* Collapsed nav items — first from each group */}
        {NAV_GROUPS.flatMap((g) => g.items.slice(0, 1)).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={cn(
                "p-2 transition-colors",
                isActive ? "text-midground" : "opacity-40 hover:opacity-100"
              )}
            >
              <Icon className="h-4 w-4" />
            </NavLink>
          );
        })}

        <div className="flex-1" />

        {/* Command palette trigger */}
        <button
          onClick={onCommandPalette}
          title="Search (Ctrl+K)"
          className="p-2 opacity-40 hover:opacity-100 transition-opacity"
        >
          <Search className="h-4 w-4" />
        </button>
      </nav>
    );
  }

  // ── Expanded mode ───────────────────────────────────────────────

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-40 w-48 bg-background-base/95 backdrop-blur-sm border-r border-current/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-current/20">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-midground" />
          <span className="text-[0.85rem] font-bold tracking-[0.04em] text-midground">
            Mission Control
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 opacity-40 hover:opacity-100 transition-opacity"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search trigger */}
      <button
        onClick={onCommandPalette}
        className="mx-2 mt-2 mb-1 flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/50 hover:border-border transition-colors"
      >
        <Search className="h-3 w-3" />
        <span>Search...</span>
        <kbd className="ml-auto text-[9px] border border-border px-1 font-mono">⌘K</kbd>
      </button>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-none">
        {/* Favorites section */}
        {favItems.length > 0 && (
          <div className="mb-3">
            <div className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-1">
              <Star className="h-2.5 w-2.5" fill="currentColor" />
              Favorites
            </div>
            {favItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={`fav-${item.path}`}
                  to={item.path}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-1.5 text-[0.7rem] tracking-[0.06em] transition-colors",
                    isActive
                      ? "text-midground bg-midground/5"
                      : "opacity-60 hover:opacity-100 hover:bg-midground/3"
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <button
                    onClick={(e) => handleFavToggle(e, item.path)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  >
                    <Star className="h-2.5 w-2.5 text-warning" fill="currentColor" />
                  </button>
                </NavLink>
              );
            })}
            <div className="mx-3 my-2 border-t border-current/10" />
          </div>
        )}

        {/* Grouped sections */}
        {NAV_GROUPS.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.id];
          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                {isGroupCollapsed ? (
                  <ChevronRight className="h-2.5 w-2.5" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5" />
                )}
                {group.label}
              </button>

              {!isGroupCollapsed && group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const isFav = favorites.includes(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "group relative flex items-center gap-2 pl-5 pr-3 py-1.5 text-[0.7rem] tracking-[0.06em] transition-colors",
                      isActive
                        ? "text-midground bg-midground/5"
                        : "opacity-60 hover:opacity-100 hover:bg-midground/3"
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1 bottom-1 w-px bg-midground"
                        style={{ mixBlendMode: "plus-lighter" }}
                      />
                    )}
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <button
                      onClick={(e) => handleFavToggle(e, item.path)}
                      className={cn(
                        "p-0.5 transition-opacity",
                        isFav ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                      )}
                    >
                      <Star
                        className="h-2.5 w-2.5"
                        fill={isFav ? "currentColor" : "none"}
                        style={{ color: isFav ? "#ffbd38" : undefined }}
                      />
                    </button>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-current/20 flex items-center justify-between">
        <span className="text-[0.55rem] tracking-[0.15em] opacity-40">Mission Control</span>
        <span className="text-[0.5rem] opacity-30">v2</span>
      </div>
    </nav>
  );
}
