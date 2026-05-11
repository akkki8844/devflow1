import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-gradient", className)}>{children}</span>;
}
