import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listScans, deleteScan } from "@/lib/scanner.functions";
import { GridBackground } from "@/components/devflow/grid-background";
import { GlassCard } from "@/components/devflow/glass-card";
import { Wordmark } from "@/components/devflow/logo";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/devflow/animated-counter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Activity, GitBranch, Github, LogOut, Shield, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const nav = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const listFn = useServerFn(listScans);
  const deleteFn = useServerFn(deleteScan);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) nav({ to: "/login" });
      else {
        setEmail(data.user.email ?? null);
        setAuthed(true);
      }
    });
  }, [nav]);

  const { data: scans = [] } = useQuery({
    queryKey: ["scans"],
    queryFn: () => listFn(),
    enabled: authed,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Scan deleted");
      qc.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const stats = [
    { icon: GitBranch, label: "Repos scanned", value: scans.length, tint: "text-primary" },
    {
      icon: Sparkles,
      label: "AI insights",
      value: scans.reduce((acc, s: any) => acc + ((s.results?.suggestions?.length ?? 0) + (s.results?.optimizations?.length ?? 0)), 0),
      tint: "text-accent",
    },
    {
      icon: Activity,
      label: "Avg. health",
      value: scans.length
        ? Math.round(scans.reduce((a, s: any) => a + (s.results?.healthScore ?? 0), 0) / scans.length)
        : 0,
      suffix: "%",
      tint: "text-success",
    },
    {
      icon: Shield,
      label: "Security warnings",
      value: scans.reduce((acc, s: any) => acc + (s.results?.securityWarnings?.length ?? 0), 0),
      tint: "text-warning",
    },
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Welcome back.</h1>
            <p className="text-muted-foreground mt-1">Your repository intelligence, at a glance.</p>
          </div>
          <Button asChild variant="glow" size="lg">
            <Link to="/scanner">New scan <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.tint}`} />
                </div>
                <div className="mt-3 font-display text-4xl">
                  <AnimatedCounter value={s.value} suffix={s.suffix ?? ""} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">Recent scans</h2>
            <Link to="/scanner" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
          </div>

          {scans.length === 0 ? (
            <GlassCard glow className="p-12 text-center">
              <Github className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="mt-4 font-display text-2xl">No scans yet</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Drop a GitHub URL into the Scanner. DevFlow will map the architecture, surface risks, and brief you on the codebase.
              </p>
              <Button asChild variant="glow" className="mt-6">
                <Link to="/scanner">Run your first scan <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </GlassCard>
          ) : (
            <div className="grid gap-3">
              {scans.map((s: any) => (
                <GlassCard key={s.id} className="p-0 group hover:border-primary/40 transition-colors overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <Link
                      to="/scan/$id"
                      params={{ id: s.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Github className="h-3.5 w-3.5" /> {s.owner}/{s.repo_name}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1 max-w-2xl">{s.summary}</p>
                    </Link>
                    <div className="flex items-center gap-4 text-xs">
                      {s.results?.healthScore != null && (
                        <span className="text-success font-display text-lg">{s.results.healthScore}</span>
                      )}
                      <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                      <Button asChild variant="glass" size="sm">
                        <Link to="/scan/$id" params={{ id: s.id }}>
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete scan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {s.owner}/{s.repo_name} will be permanently removed. This can't be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => delMut.mutate(s.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
