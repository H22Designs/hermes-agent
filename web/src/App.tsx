import { useState, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SelectionSwitcher } from "@nous-research/ui";
import { Backdrop } from "@/components/Backdrop";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n";
import { usePlugins } from "@/plugins";

// ── Page imports ──────────────────────────────────────────────────
import HomeDashboard from "@/pages/HomeDashboard";
import DashboardPage from "@/pages/DashboardPage";
import ActivityPage from "@/pages/ActivityPage";
import GatewayPage from "@/pages/GatewayPage";
import BoardsPage from "@/pages/BoardsPage";
import BoardDetailPage from "@/pages/BoardDetailPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import MarketplacePage from "@/pages/MarketplacePage";
import LiveMonitorPage from "@/pages/LiveMonitorPage";
import ResourceUsagePage from "@/pages/ResourceUsagePage";
import CollaborationPage from "@/pages/CollaborationPage";
import AgentsPage from "@/pages/AgentsPage";
import SessionTimelinePage from "@/pages/SessionTimelinePage";
import AgentChatPage from "@/pages/AgentChatPage";
import StatusPage from "@/pages/StatusPage";
import SessionsPage from "@/pages/SessionsPage";
import LogsPage from "@/pages/LogsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import CronPage from "@/pages/CronPage";
import SkillsPage from "@/pages/SkillsPage";
import ConfigPage from "@/pages/ConfigPage";
import EnvPage from "@/pages/EnvPage";

// ── Layout persistence ────────────────────────────────────────────

function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem("hermes-sidebar-state") === "collapsed";
  } catch {
    return false;
  }
}

function setSidebarCollapsed(collapsed: boolean) {
  localStorage.setItem("hermes-sidebar-state", collapsed ? "collapsed" : "expanded");
}

// ── Component ─────────────────────────────────────────────────────

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed_] = useState(getSidebarCollapsed);
  const { t } = useI18n();
  const { plugins } = usePlugins();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed_((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      return next;
    });
  }, []);

  // Command palette is rendered inside CommandPalette component
  // We expose a trigger function via a keyboard shortcut (Cmd+K)
  // The Sidebar also has a button that we handle via a ref trick
  const triggerPalette = useCallback(() => {
    // Dispatch a synthetic Cmd+K event to open the palette
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  }, []);

  const mainMargin = sidebarCollapsed ? "ml-12" : "ml-48";

  return (
    <div className="text-midground font-mondwest bg-black min-h-screen flex antialiased overflow-x-hidden">
      <SelectionSwitcher />
      <Backdrop />

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        onCommandPalette={triggerPalette}
      />

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-h-screen ${mainMargin} transition-all duration-200`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-current/20 bg-background-base/90 backdrop-blur-sm">
          <div className="flex items-center justify-end h-10 px-4 gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <span className="text-[0.55rem] tracking-[0.15em] opacity-40 hidden sm:inline">
              {t.app.webUi}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-8">
          <Routes>
            {/* Home */}
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Operations */}
            <Route path="/monitor" element={<LiveMonitorPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:sessionId" element={<SessionTimelinePage />} />
            <Route path="/chat" element={<AgentChatPage />} />
            <Route path="/agents" element={<AgentsPage />} />

            {/* Infrastructure */}
            <Route path="/resources" element={<ResourceUsagePage />} />
            <Route path="/gateway" element={<GatewayPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/logs" element={<LogsPage />} />

            {/* Management */}
            <Route path="/boards" element={<BoardsPage />} />
            <Route path="/boards/:boardId" element={<BoardDetailPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/cron" element={<CronPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/collaboration" element={<CollaborationPage />} />

            {/* Config */}
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/env" element={<EnvPage />} />

            {/* Plugins */}
            {plugins.map(({ manifest, component: PluginComponent }) => (
              <Route
                key={manifest.name}
                path={manifest.tab.path}
                element={<PluginComponent />}
              />
            ))}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-current/20 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.55rem] tracking-[0.12em] opacity-40">
              Mission Control
            </span>
            <span className="text-[0.5rem] tracking-[0.15em] opacity-30">
              Hermes Agent
            </span>
          </div>
        </footer>
      </div>

      {/* Command palette (global) */}
      <CommandPalette />
    </div>
  );
}
