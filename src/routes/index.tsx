import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Briefcase, Clock, Users, BarChart3, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentFlow — Recruitment & Vacancy Management" },
      { name: "description", content: "Enterprise ATS for IT staffing teams: vacancies, replacement hiring SLAs, candidate pipelines, and interview orchestration." },
      { property: "og:title", content: "TalentFlow — Recruitment & Vacancy Management" },
      { property: "og:description", content: "Hire faster, replace seamlessly." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">T</div>
            <span className="font-semibold tracking-tight">TalentFlow</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
            <Zap className="size-3" /> Built for IT staffing teams
          </div>
          <h1 className="text-5xl font-semibold tracking-tight leading-[1.05]">
            Hire faster.<br />
            <span className="text-accent">Replace seamlessly.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            TalentFlow is an end-to-end recruitment platform: vacancies, replacement hiring SLAs,
            candidate pipelines, and interview orchestration in one place.
          </p>
          <div className="flex gap-3 pt-2">
            <Button asChild size="lg"><Link to="/auth">Start free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">Sign in</Link></Button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Live SLA snapshot</div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Open Requirements" value="24" />
            <Kpi label="Replacements" value="7" accent />
            <Kpi label="Interviews this week" value="18" />
            <Kpi label="SLA breaches" value="2" danger />
          </div>
        </div>
      </section>

      <section className="border-t bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
          <Feature icon={Briefcase} title="Vacancy management" desc="Track every requirement with client, role, level, skills, and a full audit timeline." />
          <Feature icon={Clock} title="Replacement SLAs" desc="Auto-compute deployment deadlines from notice period and early-relieving dates." />
          <Feature icon={Users} title="Candidate pipeline" desc="Kanban + list views, drag-and-drop status, resume parsing (coming soon)." />
          <Feature icon={ShieldCheck} title="Role-based access" desc="HR Admin, Recruitment Manager, Recruiter, Hiring Manager — clean separation." />
          <Feature icon={BarChart3} title="Dashboards" desc="Recruiter performance, client-wise hiring, monthly trends, aging reports." />
          <Feature icon={Zap} title="AI-ready" desc="Resume parsing, JD matching, and closure prediction available on request." />
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © TalentFlow — Recruitment OS
      </footer>
    </div>
  );
}

function Kpi({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-accent" : danger ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <Icon className="size-5 text-accent mb-3" />
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
    </div>
  );
}
