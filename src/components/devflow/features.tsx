import { motion } from "framer-motion";
import {
  Brain, Shield, GitBranch, MessageSquare, BookOpen, Users, Zap, Network, FileCode,
} from "lucide-react";
import { GlassCard } from "@/components/devflow/glass-card";
import { GradientText } from "@/components/devflow/gradient-text";

const features = [
  { icon: Brain, title: "AI Repository Summary", desc: "Instantly understand purpose, architecture, and tech stack of any codebase." },
  { icon: Network, title: "Architecture Visualization", desc: "Interactive node graphs mapping services, dependencies, and data flow." },
  { icon: Shield, title: "Security Analysis", desc: "Detect vulnerable dependencies and risky patterns in seconds." },
  { icon: GitBranch, title: "Code Complexity", desc: "Heatmaps and complexity scores across files, modules, and packages." },
  { icon: MessageSquare, title: "Repository Chat", desc: "Ask anything about the codebase — answers grounded in real files." },
  { icon: BookOpen, title: "Onboarding Guides", desc: "Auto-generated walk-throughs designed for new engineers." },
  { icon: FileCode, title: "README Generation", desc: "Production-grade documentation, ready to ship." },
  { icon: Users, title: "Contributor Insights", desc: "Commit frequency, PR analytics, and maintenance health." },
  { icon: Zap, title: "Bug & Optimization Hints", desc: "Pinpoint hotspots and AI-suggested refactors." },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-gradient mb-3">EVERYTHING YOU NEED</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            An AI engineering copilot for <GradientText>your repos</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Nine intelligent surfaces — one streamlined workflow. From scan to ship in minutes, not days.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <GlassCard className="p-6 h-full group hover:border-primary/30 transition-all hover:-translate-y-1 duration-300">
                <div className="h-11 w-11 rounded-xl bg-gradient-primary/10 grid place-items-center mb-4 relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-primary opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
                  <f.icon className="h-5 w-5 text-primary relative" />
                </div>
                <h3 className="font-display font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
