import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GridBackground } from "@/components/devflow/grid-background";
import { GlassCard } from "@/components/devflow/glass-card";
import { Wordmark } from "@/components/devflow/logo";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/devflow/animated-counter";
import { GitBranch, Shield, Sparkles, Activity, LogOut } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const nav = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) nav({ to: "/login" });
      else setEmail(data.user.email ?? null);
    });
  }, [nav]);

  const stats = [
    { icon: GitBranch, label: "Repos scanned", value: 24, tint: "text-primary" },
    { icon: Sparkles, label: "AI insights", value: 312, tint: "text-accent" },
    { icon: Activity, label: "Health score", value: 87, suffix: "%", tint: "text-success" },
    { icon: Shield, label: "Security warnings", value: 3, tint: "text-warning" },
  ];

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <nav className="glass rounded-2xl flex items-center justify-between px-4 py-2.5">
            <Link to="/" className="flex items-center"><Wordmark /></Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">{email}</span>
              <Button variant="glass" size="sm" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/login" }); }}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-3xl font-bold">Welcome back 👋</h1>
        <p className="text-muted-foreground mt-1">Here's a snapshot of your repository intelligence.</p>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <GlassCard key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.tint}`} />
              </div>
              <div className="mt-3 font-display text-3xl font-bold">
                <AnimatedCounter value={s.value} suffix={s.suffix ?? ""} />
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard glow className="mt-8 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold">More dashboards coming online</h2>
          <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
            Repository Scanner, AI Repo Chat, Architecture Maps, Contributor Insights, README Generator,
            and Settings are queued for the next build pass.
          </p>
        </GlassCard>
      </main>
    </div>
  );
}
