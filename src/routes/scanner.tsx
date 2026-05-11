import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { scanRepository, type ScanResults } from "@/lib/scanner.functions";
import { GridBackground } from "@/components/devflow/grid-background";
import { GlassCard } from "@/components/devflow/glass-card";
import { Wordmark } from "@/components/devflow/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCode,
  Github,
  Lightbulb,
  Shield,
  Sparkles,
  Star,
  GitFork,
  Zap,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/scanner")({ component: ScannerPage });

const PHASES = [
  { label: "Cloning repository metadata", icon: Github },
  { label: "Parsing file tree & dependencies", icon: FileCode },
  { label: "Mapping architecture", icon: Activity },
  { label: "Generating AI insights", icon: Sparkles },
];

function ScannerPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState(-1);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanFn = useServerFn(scanRepository);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) nav({ to: "/login" });
      else setReady(true);
    });
  }, [nav]);

  useEffect(() => {
    if (!scanning) return;
    let i = 0;
    setPhase(0);
    const t = setInterval(() => {
      i = Math.min(i + 1, PHASES.length - 1);
      setPhase(i);
    }, 1400);
    return () => clearInterval(t);
  }, [scanning]);

  async function onScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.match(/github\.com\/[^/]+\/[^/?#]+/i)) {
      return toast.error("Paste a valid GitHub repo URL");
    }
    setResults(null);
    setScanning(true);
    try {
      const { results } = await scanFn({ data: { repoUrl: url } });
      setResults(results);
      setPhase(PHASES.length);
      toast.success("Scan complete");
    } catch (err: any) {
      toast.error(err?.message ?? "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <nav className="glass rounded-2xl flex items-center justify-between px-4 py-2.5">
            <Link to="/dashboard" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <Wordmark />
            </Link>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Repository Scanner
          </Badge>
          <h1 className="font-display text-4xl sm:text-5xl">Analyze any GitHub repo.</h1>
          <p className="mt-3 text-muted-foreground">
            Paste a public repository URL. DevFlow inspects the tree, maps the architecture, and ships an opinionated engineering report.
          </p>
        </div>

        <form onSubmit={onScan} className="mt-10 mx-auto max-w-2xl">
          <GlassCard glow className="p-2 flex items-center gap-2">
            <Github className="h-5 w-5 ml-3 text-muted-foreground shrink-0" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/vercel/next.js"
              className="border-0 bg-transparent focus-visible:ring-0 h-12 text-base"
              disabled={scanning}
            />
            <Button type="submit" variant="glow" size="lg" disabled={scanning} className="shrink-0">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Scan <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </GlassCard>
          <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
            {["vercel/next.js", "facebook/react", "tanstack/router"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setUrl(`https://github.com/${s}`)}
                className="text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        <AnimatePresence mode="wait">
          {scanning && (
            <motion.div
              key="phases"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-12 max-w-2xl mx-auto"
            >
              <GlassCard className="p-6">
                <div className="space-y-3">
                  {PHASES.map((p, i) => {
                    const done = i < phase;
                    const active = i === phase;
                    return (
                      <div key={p.label} className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg grid place-items-center transition-colors ${done ? "bg-primary/15 text-primary" : active ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"}`}>
                          {done ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <p.icon className="h-4 w-4" />}
                        </div>
                        <span className={active ? "text-foreground" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}>
                          {p.label}
                        </span>
                        {active && (
                          <div className="flex-1 ml-2 h-px rounded-full overflow-hidden bg-muted/30 animate-shimmer" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {results && !scanning && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 space-y-6"
            >
              <ResultsView r={results} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ResultsView({ r }: { r: ScanResults }) {
  return (
    <>
      <GlassCard glow className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Github className="h-3.5 w-3.5" /> {r.repo.fullName}
            </div>
            <h2 className="font-display text-3xl mt-2">{r.repo.fullName.split("/")[1]}</h2>
            {r.repo.description && <p className="mt-1 text-muted-foreground max-w-2xl">{r.repo.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {r.repo.stars.toLocaleString()}</span>
              <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> {r.repo.forks.toLocaleString()}</span>
              {r.repo.language && <span className="px-2 py-0.5 rounded-full border border-border">{r.repo.language}</span>}
              <span>{r.repo.fileCount} files</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Metric label="Health" value={r.healthScore} tint="text-success" />
            <Metric label="Complexity" value={r.complexity} tint="text-warning" />
          </div>
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-sm leading-relaxed">{r.summary}</p>
        </div>
      </GlassCard>

      <Tabs defaultValue="architecture">
        <TabsList className="glass">
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="stack">Stack</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="architecture" className="mt-4 grid md:grid-cols-2 gap-4">
          <GlassCard className="p-5">
            <h3 className="font-display text-xl mb-2">Architecture</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{r.architecture}</p>
          </GlassCard>
          <div className="grid gap-4">
            <ListCard title="Strengths" icon={Check} items={r.strengths} tint="text-success" />
            <ListCard title="Risks" icon={AlertTriangle} items={r.risks} tint="text-warning" />
          </div>
        </TabsContent>

        <TabsContent value="stack" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-display text-xl mb-3">Tech stack</h3>
            <div className="flex flex-wrap gap-2">
              {r.techStack.map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-full bg-muted/40 border border-border text-sm font-mono">{t}</span>
              ))}
            </div>
            {r.repo.topics.length > 0 && (
              <>
                <h4 className="mt-6 mb-2 text-xs uppercase tracking-widest text-muted-foreground">Repo topics</h4>
                <div className="flex flex-wrap gap-2">
                  {r.repo.topics.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full border border-border text-xs">{t}</span>
                  ))}
                </div>
              </>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-3">
          {r.securityWarnings.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Shield className="h-8 w-8 mx-auto text-success" />
              <p className="mt-3 text-muted-foreground">No notable security warnings detected.</p>
            </GlassCard>
          ) : (
            r.securityWarnings.map((w, i) => (
              <GlassCard key={i} className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${w.severity === "high" ? "text-destructive" : w.severity === "medium" ? "text-warning" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{w.title}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase">{w.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{w.description}</p>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4 grid md:grid-cols-2 gap-4">
          <ListCard title="AI suggestions" icon={Lightbulb} items={r.suggestions} tint="text-primary" />
          <ListCard title="Optimizations" icon={Zap} items={r.optimizations} tint="text-accent" />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <GlassCard className="p-5">
            <h3 className="font-display text-xl mb-3">Top files</h3>
            <div className="font-mono text-xs grid sm:grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
              {r.repo.topFiles.map((f) => (
                <div key={f} className="truncate">{f}</div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Metric({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl ${tint}`}>{value}</div>
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  items,
  tint,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  tint: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${tint}`} />
        <h3 className="font-display text-xl">{title}</h3>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-muted-foreground">
            <span className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${tint.replace("text-", "bg-")}`} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
