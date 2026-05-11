import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

export const GlassCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div"> & { glow?: boolean }>(
  ({ className, glow, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "relative rounded-2xl glass overflow-hidden",
        glow && "shadow-elegant",
        className
      )}
      {...props}
    >
      {glow && (
        <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-40"
             style={{ background: "var(--gradient-glow)" }} />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  )
);
GlassCard.displayName = "GlassCard";
