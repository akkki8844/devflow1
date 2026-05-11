import { motion } from "framer-motion";
import { GlassCard } from "@/components/devflow/glass-card";
import { GradientText } from "@/components/devflow/gradient-text";
import { CheckCircle2, FileWarning, Network } from "lucide-react";

const nodes = [
  { id: "web", label: "Web App", x: 12, y: 50, tint: "from-primary to-primary/40" },
  { id: "api", label: "API Gateway", x: 38, y: 25, tint: "from-accent to-accent/40" },
  { id: "auth", label: "Auth Service", x: 38, y: 75, tint: "from-success to-success/40" },
  { id: "db", label: "Postgres", x: 68, y: 25, tint: "from-chart-4 to-chart-4/40" },
  { id: "ai", label: "AI Worker", x: 68, y: 75, tint: "from-chart-5 to-chart-5/40" },
  { id: "cache", label: "Redis", x: 90, y: 50, tint: "from-warning to-warning/40" },
];
const edges: [string, string][] = [
  ["web", "api"], ["web", "auth"], ["api", "db"], ["api", "ai"], ["auth", "db"], ["db", "cache"], ["ai", "cache"],
];

function pos(id: string) { return nodes.find((n) => n.id === id)!; }

export function DemoPreview() {
  return (
    <section id="demo" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium text-gradient mb-3">SEE IT IN ACTION</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            From URL to <GradientText>insights</GradientText> in 30 seconds
          </h2>
          <p className="mt-4 text-muted-foreground">
            Paste any GitHub repository. Get a complete architecture map, security audit, and AI-narrated tour.
          </p>
        </div>

        <div className="mt-16 grid lg:grid-cols-5 gap-6">
          {/* Architecture visualization */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            <GlassCard glow className="p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Architecture Map</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">vercel/next.js · main</span>
              </div>
              <div className="relative h-80 rounded-xl bg-[oklch(0.1_0.02_270)] overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="oklch(0.7 0.22 295)" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="oklch(0.78 0.18 220)" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  {edges.map(([a, b], i) => {
                    const p1 = pos(a); const p2 = pos(b);
                    return (
                      <motion.line
                        key={i}
                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                        stroke="url(#edge)" strokeWidth="0.3"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.3 + i * 0.1 }}
                      />
                    );
                  })}
                </svg>
                {nodes.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + i * 0.08, type: "spring" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  >
                    <div className={`relative px-3 py-1.5 rounded-lg glass border-primary/30 text-xs font-medium whitespace-nowrap`}>
                      <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${n.tint} opacity-30 blur`} />
                      <span className="relative">{n.label}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Insights cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Repository Health</span>
                <span className="text-2xl font-display font-bold text-gradient">82</span>
              </div>
              <div className="space-y-2 text-xs">
                <Bar label="Maintainability" value={88} tone="success" />
                <Bar label="Test Coverage" value={74} tone="primary" />
                <Bar label="Documentation" value={65} tone="warning" />
                <Bar label="Security" value={91} tone="success" />
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileWarning className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">AI Findings</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[
                  "Circular dependency in lib/router/parse.ts",
                  "Heavy module: 142kb in components/editor",
                  "Outdated: react-router-dom 6.4 → 7.0",
                  "Untested: 14 functions in utils/ai/",
                ].map((s, i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /><span>{s}</span></li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "success" | "primary" | "warning" }) {
  const cls = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="flex justify-between text-muted-foreground mb-1">
        <span>{label}</span><span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div initial={{ width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut" }} className={`h-full ${cls}`} />
      </div>
    </div>
  );
}
