import { GlassCard } from "@/components/devflow/glass-card";
import { GradientText } from "@/components/devflow/gradient-text";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Github, Twitter, Linkedin } from "lucide-react";

export function CtaFooter() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <GlassCard glow className="p-12 lg:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 -z-0 grid-bg opacity-50" />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tighter max-w-3xl mx-auto">
              Ship faster with <GradientText>AI engineering insight.</GradientText>
            </h2>
            <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
              Join thousands of engineers using DevFlow AI to understand any codebase in seconds.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild variant="glow" size="xl">
                <Link to="/signup">Start free <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </GlassCard>

        <footer className="mt-16 pt-10 border-t border-border flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-primary grid place-items-center">
              <span className="text-primary-foreground font-bold text-xs">D</span>
            </div>
            <span className="text-sm text-muted-foreground">© 2026 DevFlow AI · All rights reserved</span>
          </div>
          <div className="flex items-center gap-5 text-muted-foreground">
            <a href="#" className="hover:text-foreground"><Github className="h-4 w-4" /></a>
            <a href="#" className="hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="#" className="hover:text-foreground"><Linkedin className="h-4 w-4" /></a>
          </div>
        </footer>
      </div>
    </section>
  );
}
