import { Lock } from "lucide-react";
import { GlassCard } from "@/components/devflow/glass-card";
import type { ScanResults } from "@/lib/scanner.functions";

const SECTIONS: { key: keyof NonNullable<ScanResults["techStackDetailed"]>; label: string }[] = [
  { key: "languages", label: "Languages" },
  { key: "frameworks", label: "Frameworks" },
  { key: "libraries", label: "Libraries" },
  { key: "buildTools", label: "Build & tooling" },
  { key: "testing", label: "Testing" },
  { key: "databases", label: "Databases" },
  { key: "infrastructure", label: "Infrastructure & CI" },
];

export function TechStackView({ r }: { r: ScanResults }) {
  const detailed = r.techStackDetailed;
  const hasDetailed =
    detailed && SECTIONS.some((s) => (detailed[s.key] ?? []).length > 0);

  const langs = r.repo.languages ?? {};
  const langEntries = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  const totalBytes = langEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl">Tech stack</h3>
          {r.repo.isPrivate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-warning/40 bg-warning/10 text-warning text-[10px] uppercase tracking-widest">
              <Lock className="h-3 w-3" /> Private
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Derived from the repo's dependency manifests, file tree, and language byte breakdown — not from any AI-builder
          metadata.
        </p>

        {langEntries.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Language distribution
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted/30">
              {langEntries.map(([name, bytes], i) => {
                const pct = totalBytes ? (bytes / totalBytes) * 100 : 0;
                const colors = [
                  "bg-primary",
                  "bg-accent",
                  "bg-success",
                  "bg-warning",
                  "bg-info",
                  "bg-muted-foreground",
                ];
                return (
                  <div
                    key={name}
                    className={colors[i % colors.length]}
                    style={{ width: `${pct}%` }}
                    title={`${name} • ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {langEntries.slice(0, 8).map(([name, bytes], i) => {
                const pct = totalBytes ? (bytes / totalBytes) * 100 : 0;
                const dots = [
                  "bg-primary",
                  "bg-accent",
                  "bg-success",
                  "bg-warning",
                  "bg-info",
                  "bg-muted-foreground",
                ];
                return (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${dots[i % dots.length]}`} />
                    {name} <span className="text-foreground/60">{pct.toFixed(1)}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {hasDetailed ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {SECTIONS.map((s) => {
              const items = detailed[s.key] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={s.key}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    {s.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-md bg-muted/40 border border-border text-xs font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {r.techStack.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full bg-muted/40 border border-border text-sm font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {r.repo.topics.length > 0 && (
          <>
            <h4 className="mt-6 mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Repo topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {r.repo.topics.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full border border-border text-xs"
                >
                  {t}
                </span>
              ))}
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}
