import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-7 w-7", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.94 0.16 130)" />
          <stop offset="1" stopColor="oklch(0.82 0.19 138)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="oklch(0.2 0.005 240)" stroke="oklch(1 0 0 / 0.08)" />
      {/* fork / flow mark */}
      <path
        d="M9 22 L9 10 L15 10 C19 10 22 12.5 22 16 C22 19.5 19 22 15 22 Z"
        stroke="url(#lm-g)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="10" r="1.6" fill="url(#lm-g)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-sans-display text-[15px] tracking-tight">
        devflow<span className="text-primary">.</span>
      </span>
    </span>
  );
}
