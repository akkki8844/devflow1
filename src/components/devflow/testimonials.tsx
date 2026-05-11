import { GlassCard } from "@/components/devflow/glass-card";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const items = [
  { name: "Sara Yamashita", role: "Staff Engineer, Linear", quote: "DevFlow AI cut our new-hire ramp time from 6 weeks to 9 days. It's the diff between reading code and understanding it.", initials: "SY" },
  { name: "Marcus Hoffmann", role: "CTO, Plaintext.ai", quote: "I paste a repo, get a CTO-grade summary, security audit, and architecture map in under a minute. Feels illegal.", initials: "MH" },
  { name: "Aditi Rao", role: "Eng Manager, Stripe", quote: "The chat is the killer feature — it's like pairing with someone who's read every file in the monorepo.", initials: "AR" },
  { name: "Daniel Becker", role: "Founder, Lumen", quote: "We replaced three internal tools with DevFlow AI. Saved us an entire DX engineer's worth of effort.", initials: "DB" },
];

export function Testimonials() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-gradient mb-3">LOVED BY ENGINEERS</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Built for teams that ship.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {items.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard className="p-7 h-full">
                <Quote className="h-5 w-5 text-primary mb-3" />
                <p className="text-foreground/90 text-base leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-xs font-semibold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
