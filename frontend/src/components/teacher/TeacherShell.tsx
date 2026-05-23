import { Link, useLocation } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  FolderKanban,
  GraduationCap,
  LineChart,
  LogOut,
  Menu,
  School,
  Search,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { teacherProfile } from "@/data/teacher";

const teacherNav: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/teacher", label: "Overview", icon: BarChart3 },
  { to: "/teacher/classes", label: "Classes", icon: Users },
  { to: "/teacher/courses", label: "Courses", icon: BookOpen },
  { to: "/teacher/projects", label: "Projects", icon: FolderKanban },
  { to: "/teacher/analytics", label: "Analytics", icon: LineChart },
];

function isNavActive(pathname: string, to: string): boolean {
  if (to === "/teacher") {
    return pathname === "/teacher" || pathname === "/teacher/";
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function TeacherShell({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="min-h-screen bg-muted/30">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close teacher menu"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card shadow-card transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between gap-3 px-1 py-2">
            <Link
              to="/teacher"
              className="flex items-center gap-3 min-w-0"
              onClick={() => setMobileOpen(false)}
            >
              <div className="h-11 w-11 rounded-2xl gradient-primary grid place-items-center text-primary-foreground shadow-glow">
                <School className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg font-bold truncate">Teacher Office</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Back office
                </div>
              </div>
            </Link>
            <button
              type="button"
              className="lg:hidden rounded-xl p-2 hover:bg-muted"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {teacherNav.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(path, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="mt-2 w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>

          <div className="mt-auto rounded-2xl border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center text-primary-foreground text-sm font-bold shadow-soft">
                {teacherProfile.initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{teacherProfile.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {teacherProfile.department}
                </div>
              </div>
            </div>
            <Link
              to="/"
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Student front office
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-8">
            <button
              type="button"
              className="lg:hidden rounded-xl p-2 hover:bg-muted"
              onClick={() => setMobileOpen(true)}
              aria-label="Open teacher menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              {eyebrow ? (
                <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
                  {eyebrow}
                </div>
              ) : null}
              <h1 className="font-display text-xl font-bold truncate">{title}</h1>
            </div>
            <div className="ml-auto hidden md:flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search classes, courses, students..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/60 border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm transition-colors"
                />
              </div>
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {description ? (
              <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>
            ) : null}
            <GraduationHelperBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function GraduationHelperBanner() {
  return (
    <div className="hidden xl:flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-2 text-xs text-muted-foreground">
      <GraduationCap className="h-4 w-4 text-primary" />
      <span>
        Tip: <strong className="text-foreground">Classes</strong> show your students.{" "}
        <strong className="text-foreground">Courses</strong> hold chapters and materials.{" "}
        <strong className="text-foreground">Projects</strong> assign tasks students track on their
        dashboard.
      </span>
    </div>
  );
}
