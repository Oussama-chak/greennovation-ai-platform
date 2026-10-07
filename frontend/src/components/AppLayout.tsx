import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  Library,
  Sparkles,
  Bell,
  Search,
  Menu,
  X,
  Zap,
  Users,
  CalendarDays,
} from "lucide-react";
import { DailyReward } from "@/components/DailyReward";
import { FloatingBamboo } from "@/components/FloatingBamboo";
import { TreeRewardToast } from "@/components/TreeRewardToast";
import {
  BreathingBreak,
  BreathingBreakButton,
  BreathingBreakIconButton,
} from "@/components/BreathingBreak";
import { BreathingBreakProvider } from "@/context/BreathingBreakContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/learning", label: "Learning", icon: GraduationCap },
  { to: "/community", label: "Community", icon: Users },
  { to: "/wellbeing", label: "Well-being", icon: HeartPulse },
  { to: "/forest", label: "Knowledge Library", icon: Library },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const { location } = useRouterState();
  const path = location.pathname;
  const isStudy = path.includes("/study");

  // expanded if hovered (desktop) OR mobile menu open
  const expanded = hoverExpanded || mobileOpen;

  return (
    <BreathingBreakProvider openBreathingBreak={() => setBreakOpen(true)}>
      <div className="min-h-screen flex w-full">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          onMouseEnter={() => setHoverExpanded(true)}
          onMouseLeave={() => setHoverExpanded(false)}
          className={`fixed lg:sticky top-0 left-0 z-50 h-screen shrink-0 transform transition-all duration-[250ms] ease-out lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${expanded ? "w-64" : "w-[72px]"}`}
        >
          <div className="flex h-full flex-col gap-2 bg-sidebar border-r border-sidebar-border p-3 overflow-hidden">
            {/* Brand */}
            <div className="flex items-center justify-between h-12 px-1">
              <Link
                to="/"
                className="flex items-center gap-2.5 min-w-0"
                onClick={() => setMobileOpen(false)}
              >
                <div className="relative h-10 w-10 rounded-2xl gradient-primary grid place-items-center shadow-glow shrink-0">
                  <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
                </div>
                <div
                  className={`leading-tight whitespace-nowrap transition-all duration-200 ${
                    expanded
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2 pointer-events-none"
                  }`}
                >
                  <div className="font-display text-lg font-bold tracking-tight">Routiny</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    AI · OS
                  </div>
                </div>
              </Link>
              <button
                className="lg:hidden rounded-lg p-2 hover:bg-sidebar-accent shrink-0"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1 mt-4">
              {navItems.map((item) => {
                const active = path === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-xl h-11 px-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                    title={!expanded ? item.label : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
                    <span
                      className={`whitespace-nowrap transition-all duration-200 ${
                        expanded
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-2 pointer-events-none absolute"
                      }`}
                    >
                      {item.label}
                    </span>
                    {active && expanded && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
                    )}

                    {/* Tooltip for collapsed state */}
                    {!expanded && (
                      <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 shadow-card hidden lg:block z-50">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto" />
          </div>
        </aside>

        {/* Main */}
        <div className={`flex-1 flex flex-col min-w-0 ${isStudy ? "h-screen min-h-0" : ""}`}>
          <header className="sticky top-0 z-30 glass border-b border-border/60 shrink-0">
            <div
              className={`flex items-center gap-3 ${
                isStudy ? "px-3 lg:px-4 h-12" : "px-4 lg:px-8 h-16"
              }`}
            >
              <button
                className="lg:hidden rounded-lg p-2 hover:bg-muted"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className={`hidden md:flex items-center gap-2 flex-1 mx-2 ${isStudy ? "max-w-md" : "max-w-xl"}`}>
                <div className="relative w-full">
                  <Search
                    className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/80 ${
                      isStudy ? "left-3 h-3.5 w-3.5" : "left-4 h-4 w-4"
                    }`}
                  />
                  <input
                    type="search"
                    placeholder="Search courses, notes, projects..."
                    className={`w-full rounded-full bg-[oklch(0.97_0.02_95)] border border-primary/10 shadow-[inset_0_1px_2px_oklch(0.7_0.02_155/0.08)] text-sm placeholder:text-muted-foreground/70 focus:bg-card focus:border-primary/25 focus:outline-none focus:ring-4 focus:ring-primary/10 transition ${
                      isStudy ? "h-9 pl-9 pr-4" : "h-11 pl-11 pr-5"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <BreathingBreakButton onClick={() => setBreakOpen(true)} />
                <BreathingBreakIconButton onClick={() => setBreakOpen(true)} />
                <button className="relative rounded-xl p-2.5 hover:bg-muted transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                </button>
                <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center text-primary-foreground text-sm font-bold shadow-soft">
                  S
                </div>
              </div>
            </div>
          </header>

          <main
            className={
              isStudy
                ? "flex-1 min-h-0 px-1.5 lg:px-2 py-1 lg:overflow-hidden"
                : "flex-1 px-4 lg:px-8 py-6 lg:py-8"
            }
          >
            {children}
          </main>
        </div>

        <DailyReward />
        {path.includes("/study") ? null : <FloatingBamboo />}
        <TreeRewardToast />
        <BreathingBreak open={breakOpen} onOpenChange={setBreakOpen} />
      </div>
    </BreathingBreakProvider>
  );
}
