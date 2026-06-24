import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Briefcase, Users, Building2, BarChart3, LogOut, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vacancies", label: "Vacancies", icon: Briefcase },
  { to: "/clients", label: "Clients", icon: Building2 },
  { to: "/candidates", label: "Candidates", icon: Users, soon: true },
  { to: "/reports", label: "Reports", icon: BarChart3, soon: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { roles } = useRoles(user?.id);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-accent text-accent-foreground grid place-items-center font-bold">T</div>
            <div>
              <div className="font-semibold tracking-tight">TalentFlow</div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">Recruitment OS</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80"
                }`}
              >
                <Icon className="size-4" />
                <span>{n.label}</span>
                {"soon" in n && n.soon && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider opacity-50">soon</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-2 px-2 text-xs">
            <UserCircle className="size-4 opacity-70" />
            <div className="flex-1 min-w-0">
              <div className="truncate">{user?.email}</div>
              <div className="text-[10px] opacity-60 uppercase">{roles[0]?.replace(/_/g, " ") ?? "no role"}</div>
            </div>
          </div>
          <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="px-8 py-6 border-b bg-card flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
