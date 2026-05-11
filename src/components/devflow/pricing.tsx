import { GlassCard } from "@/components/devflow/glass-card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free", price: "$0", per: "/month", cta: "Get started", variant: "glass" as const,
    features: ["5 scans / month", "Public repos only", "AI repository summary", "Basic architecture map", "Community support"],
  },
  {
    name: "Pro", price: "$29", per: "/month", cta: "Start free trial", variant: "glow" as const, featured: true,
    features: ["Unlimited public scans", "50 private scans / month", "AI repository chat", "Security audit", "README + docs generation", "Priority support"],
  },
  {
    name: "Team", price: "$99", per: "/month", cta: "Contact sales", variant: "glass" as const,
    features: ["Everything in Pro", "Unlimited private scans", "Team workspaces", "SSO & audit logs", "Custom AI tuning", "Dedicated success manager"],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-medium text-gradient mb-3">PRICING</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Simple, predictable.</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when your team scales.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard glow={p.featured} className={`p-7 h-full ${p.featured ? "border-primary/40" : ""}`}>
                {p.featured && (
                  <span className="absolute top-4 right-4 text-[10px] font-semibold tracking-wider text-primary-foreground bg-gradient-primary px-2 py-0.5 rounded-full">
                    POPULAR
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.per}</span>
                </div>
                <Button asChild variant={p.variant} className="w-full mt-6">
                  <Link to="/signup">{p.cta}</Link>
                </Button>
                <ul className="mt-7 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
