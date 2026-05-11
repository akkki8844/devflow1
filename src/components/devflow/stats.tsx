import { AnimatedCounter } from "@/components/devflow/animated-counter";
import { GlassCard } from "@/components/devflow/glass-card";
import { motion } from "framer-motion";

const stats = [
  { value: 187432, suffix: "+", label: "Repositories analyzed" },
  { value: 12.4, suffix: "M", label: "AI insights generated", decimals: 1 },
  { value: 99.97, suffix: "%", label: "Uptime SLA", decimals: 2 },
  { value: 28, suffix: "s", label: "Avg. time to insight" },
];

export function Stats() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <GlassCard glow className="p-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="font-display text-4xl lg:text-5xl font-bold text-gradient">
                  <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.decimals} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
