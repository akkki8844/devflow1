import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, Shield, FileText, GitBranch, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/devflow/gradient-text";
import { GlassCard } from "@/components/devflow/glass-card";

const codeLines = [
  "$ devflow scan github.com/vercel/next.js",
  "→ Cloning repository...",
  "→ Indexed 3,841 files across 187 modules",
  "→ Detected: Next.js 15.0 · React 19 · TypeScript",
  "→ Architecture map: 12 services, 4 boundaries",
  "→ Security audit: 0 critical · 2 medium",
  "→ Complexity score: 82/100",
  "→ AI summary ready ✓",
];

const floaters = [
  { icon: Shield, label: "Security Risk Detected", sub: "openssl@1.0 — CVE-2023-…", tone: "warning", x: "8%", y: "18%", delay: 0.3 },
  { icon: FileText, label: "README Generated", sub: "12 sections · 3.2k tokens", tone: "success", x: "70%", y: "12%", delay: 0.5 },
  { icon: GitBranch, label: "Architecture Mapped", sub: "frontend ↔ api ↔ db", tone: "primary", x: "5%", y: "62%", delay: 0.7 },
  { icon: Gauge, label: "Complexity Score: 82", sub: "Healthy maintainability", tone: "accent", x: "72%", y: "60%", delay: 0.9 },
] as const;

export function Hero() {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="relative grid place-items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            New: AI Repository Chat is live
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter max-w-4xl text-balance"
          >
            Understand Any <GradientText>Codebase</GradientText> Instantly.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
          >
            DevFlow AI transforms complex GitHub repositories into understandable architecture,
            actionable insights, and AI-powered engineering guidance.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-3"
          >
            <Button asChild variant="glow" size="xl">
              <Link to="/signup">
                Start Scanning <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <a href="#demo">
                <PlayCircle className="h-4 w-4" /> Watch Demo
              </a>
            </Button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-xs text-muted-foreground"
          >
            No credit card required · Free tier includes 5 scans/month
          </motion.p>
        </div>

        {/* Code window + floating cards */}
        <div className="relative mt-20 mx-auto max-w-5xl">
          {floaters.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: f.delay, duration: 0.6 }}
              className="absolute hidden lg:block z-20"
              style={{ left: f.x, top: f.y }}
            >
              <div className="animate-float" style={{ animationDelay: `${f.delay}s` }}>
                <GlassCard glow className="w-60 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center bg-${f.tone}/15 text-${f.tone}`}>
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.sub}</p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="relative"
          >
            <GlassCard glow className="p-1">
              <div className="rounded-xl bg-[oklch(0.1_0.02_270)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <span className="h-3 w-3 rounded-full bg-destructive/70" />
                  <span className="h-3 w-3 rounded-full bg-warning/70" />
                  <span className="h-3 w-3 rounded-full bg-success/70" />
                  <span className="ml-3 text-xs text-muted-foreground font-mono">devflow ~ scan</span>
                </div>
                <div className="p-6 font-mono text-sm space-y-1.5 min-h-[300px]">
                  {codeLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.18, duration: 0.4 }}
                      className={
                        i === 0
                          ? "text-foreground"
                          : line.includes("✓") || line.includes("Healthy")
                          ? "text-success"
                          : line.includes("Security") || line.includes("medium")
                          ? "text-warning"
                          : "text-muted-foreground"
                      }
                    >
                      {line}
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.6 }}
                    className="pt-2 flex items-center gap-2"
                  >
                    <span className="text-gradient">›</span>
                    <span className="inline-block h-4 w-2 bg-foreground animate-pulse" />
                  </motion.div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
