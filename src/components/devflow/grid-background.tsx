import { cn } from "@/lib/utils";

export function GridBackground({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute inset-0 grid-bg opacity-70" />
      <div
        className="absolute left-1/2 top-[-200px] -translate-x-1/2 h-[500px] w-[900px] rounded-full blur-3xl opacity-50 animate-glow-pulse"
        style={{ background: "var(--gradient-glow)" }}
      />
    </div>
  );
}
