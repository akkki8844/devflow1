import { createFileRoute } from "@tanstack/react-router";
import { GridBackground } from "@/components/devflow/grid-background";
import { MarketingNav } from "@/components/devflow/marketing-nav";
import { Hero } from "@/components/devflow/hero";
import { Features } from "@/components/devflow/features";
import { DemoPreview } from "@/components/devflow/demo-preview";
import { Stats } from "@/components/devflow/stats";
import { Testimonials } from "@/components/devflow/testimonials";
import { Pricing } from "@/components/devflow/pricing";
import { CtaFooter } from "@/components/devflow/cta-footer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <MarketingNav />
      <main>
        <Hero />
        <Features />
        <DemoPreview />
        <Stats />
        <Testimonials />
        <Pricing />
        <CtaFooter />
      </main>
    </div>
  );
}
