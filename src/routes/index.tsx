import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, BarChart3, ShieldCheck, Zap, Clock, Video } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentFlow — Recruitment & Vacancy Management" },
      { name: "description", content: "Enterprise ATS for IT staffing: vacancies, replacement-hiring SLAs, candidate pipelines, in-app video interviews." },
      { property: "og:title", content: "TalentFlow — Recruitment OS" },
      { property: "og:description", content: "Hire faster. Apply easier. Interview from anywhere." },
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
            <Button asChild variant="ghost"><Link to="/jobs">Browse jobs</Link></Button>
            <Button asChild variant="ghost"><Link to="/auth" search={{ as: "recruiter" }}>Staff sign in</Link></Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          <Zap className="size-3" /> One platform. Two doors.
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-3xl mx-auto">
          Hire faster.<br />
          <span className="text-accent">Apply easier.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Pick your door — apply to live openings or run the full hiring desk with SLA tracking, pipelines, and built-in video interviews.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-6">
        <PortalCard
          icon={Users}
          title="For Candidates"
          desc="Browse open IT roles, apply in one click, and track your application status. Receive interview invites and join via built-in video."
          primary={{ to: "/jobs", label: "Browse open jobs" }}
          secondary={{ to: "/auth", label: "Create candidate account", search: { as: "candidate" } }}
        />
        <PortalCard
          icon={Briefcase}
          title="For Recruiters & HR"
          desc="Manage vacancies, replacement hiring SLAs, candidate pipelines, and schedule interviews. Role-based access for HR Admin, RMs, recruiters."
          primary={{ to: "/auth", label: "Staff sign in", search: { as: "recruiter" } }}
          secondary={{ to: "/auth", label: "Create staff account", search: { as: "recruiter" } }}
        />
      </section>

      <section className="border-t bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
          <Feature icon={Briefcase} title="Vacancy management" desc="Track every requirement: client, role, level, skills, full audit timeline." />
          <Feature icon={Clock} title="Replacement SLAs" desc="Auto-compute deployment deadlines from notice period & early-relieving dates." />
          <Feature icon={Users} title="Candidate pipeline" desc="Kanban + list views, drag-and-drop stages, resume storage." />
          <Feature icon={Video} title="In-app interviews" desc="Built-in WebRTC room — no Meet/Zoom needed for 1:1 interviews." />
          <Feature icon={ShieldCheck} title="Role-based access" desc="HR Admin, Recruitment Manager, Recruiter, Hiring Manager, Candidate." />
          <Feature icon={BarChart3} title="Dashboards" desc="Recruiter performance, client-wise hiring, monthly trends, aging reports." />
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">© TalentFlow — Recruitment OS</footer>
    </div>
  );
}

function PortalCard({
  icon: Icon, title, desc, primary, secondary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string;
  primary: { to: string; label: string; search?: Record<string, string> };
  secondary: { to: string; label: string; search?: Record<string, string> };
}) {
  return (
    <div className="rounded-2xl border bg-card p-8 hover:border-accent transition group">
      <div className="size-12 rounded-xl bg-accent/10 text-accent grid place-items-center mb-5 group-hover:scale-105 transition">
        <Icon className="size-6" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{desc}</p>
      <div className="flex flex-col gap-2">
        <Button asChild size="lg"><Link to={primary.to as never} search={primary.search as never}>{primary.label}</Link></Button>
        <Button asChild size="lg" variant="ghost"><Link to={secondary.to as never} search={secondary.search as never}>{secondary.label}</Link></Button>
      </div>
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
