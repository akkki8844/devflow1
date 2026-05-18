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
  head: () => ({
    meta: [
      { title: "DevFlow AI — Understand Any Codebase Instantly" },
      { name: "description", content: "AI-powered GitHub repo scanner. Map architecture, generate onboarding guides, and chat with any codebase in 60 seconds." },
      { property: "og:title", content: "DevFlow AI — Understand Any Codebase Instantly" },
      { property: "og:description", content: "AI-powered GitHub repo scanner. Map architecture, generate onboarding guides, and chat with any codebase in 60 seconds." },
      { property: "og:url", content: "https://devflow1.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://devflow1.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "DevFlow AI",
          url: "https://devflow1.lovable.app",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "DevFlow AI",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
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
