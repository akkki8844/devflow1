import { cn } from "@/lib/utils";

export function GridBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[1200px] rounded-full blur-3xl opacity-40 animate-glow-pulse"
           style={{ background: "var(--gradient-glow)" }} />
      <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full blur-3xl opacity-30"
           style={{ background: "radial-gradient(circle, oklch(0.78 0.18 220 / 0.4), transparent 70%)" }} />
    </div>
  );
}
