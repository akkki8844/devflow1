import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import {
  getScan,
  generateOnboarding,
  chatWithRepo,
  getChatHistory,
  clearChat,
  type OnboardingGuide,
  type ScanResults,
} from "@/lib/scanner.functions";
import { GridBackground } from "@/components/devflow/grid-background";
import { GlassCard } from "@/components/devflow/glass-card";
import { Wordmark } from "@/components/devflow/logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  BookOpen,
  Github,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  FolderTree,
  ListChecks,
  Rocket,
  GraduationCap,
  Link as LinkIcon,
  Copy,
  Download,
  RefreshCw,
  Trash2,
  Layers,
} from "lucide-react";
import { TechStackView } from "@/components/devflow/tech-stack-view";

export const Route = createFileRoute("/scan/$id")({
  component: ScanDetail,
  head: ({ params }) => ({
    meta: [
      { title: "Repository scan — DevFlow AI" },
      { name: "description", content: "Architecture map, onboarding guide, and repo chat for this scan." },
      { property: "og:title", content: "Repository scan — DevFlow AI" },
      { property: "og:description", content: "Architecture map, onboarding guide, and repo chat for this scan." },
      { property: "og:url", content: `https://devflow1.lovable.app/scan/${params.id}` },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `https://devflow1.lovable.app/scan/${params.id}` }],
  }),
});

function ScanDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const getScanFn = useServerFn(getScan);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) nav({ to: "/login" });
      else setReady(true);
    });
  }, [nav]);

  const { data: scan, isLoading, error } = useQuery({
    queryKey: ["scan", id],
    queryFn: () => getScanFn({ data: { id } }),
    enabled: ready,
    retry: false,
  });

  if (!ready) return null;

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <nav className="glass rounded-2xl flex items-center justify-between px-4 py-2.5">
            <Link to="/dashboard" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <Wordmark />
            </Link>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {error || (!isLoading && !scan) ? (
          <GlassCard className="p-12 text-center">
            <h2 className="font-display text-2xl">Scan unavailable</h2>
            <p className="mt-2 text-muted-foreground">{(error as any)?.message ?? "This scan doesn't exist or you don't have access to it."}</p>
            <Button asChild variant="glow" className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
          </GlassCard>
        ) : isLoading || !scan ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading scan…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Github className="h-3.5 w-3.5" /> {scan.owner}/{scan.repo_name}
                  <a
                    href={scan.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                    aria-label="Open repo on GitHub"
                  >↗</a>
                </div>
                <h1 className="font-display text-4xl mt-2">{scan.repo_name}</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl">{scan.summary}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Share
                </Button>
                {(scan.results as any)?.healthScore != null && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Health</div>
                    <div className="font-display text-4xl text-success">{(scan.results as any).healthScore}</div>
                  </div>
                )}
              </div>
            </div>

            <Tabs defaultValue="overview" className="mt-8">
              <TabsList className="glass">
                <TabsTrigger value="overview"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Overview</TabsTrigger>
                <TabsTrigger value="stack"><Layers className="h-3.5 w-3.5 mr-1.5" />Tech Stack</TabsTrigger>
                <TabsTrigger value="onboarding"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Onboard Engineer</TabsTrigger>
                <TabsTrigger value="chat"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Repo Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-4">
                <OverviewTab r={scan.results as ScanResults} />
              </TabsContent>

              <TabsContent value="stack" className="mt-6">
                <TechStackView r={scan.results as ScanResults} />
              </TabsContent>

              <TabsContent value="onboarding" className="mt-6">
                <OnboardingTab scanId={scan.id} repoLabel={`${scan.owner}/${scan.repo_name}`} initial={(scan.results as any)?.onboarding ?? null} />
              </TabsContent>

              <TabsContent value="chat" className="mt-6">
                <ChatTab scanId={scan.id} repoLabel={`${scan.owner}/${scan.repo_name}`} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function OverviewTab({ r }: { r: ScanResults }) {
  if (!r) return null;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <GlassCard className="p-5">
        <h2 className="font-display text-xl mb-2">Architecture</h2>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{r.architecture}</p>
      </GlassCard>
      <GlassCard className="p-5">
        <h2 className="font-display text-xl mb-3">Tech stack</h2>
        <div className="flex flex-wrap gap-2">
          {r.techStack?.map((t) => (
            <span key={t} className="px-3 py-1 rounded-full bg-muted/40 border border-border text-xs font-mono">{t}</span>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-5 md:col-span-2">
        <h2 className="font-display text-xl mb-3">Suggestions</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {r.suggestions?.map((s, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />{s}</li>)}
        </ul>
      </GlassCard>
    </div>
  );
}

function OnboardingTab({ scanId, repoLabel, initial }: { scanId: string; repoLabel: string; initial: OnboardingGuide | null }) {
  const genFn = useServerFn(generateOnboarding);
  const qc = useQueryClient();
  const [guide, setGuide] = useState<OnboardingGuide | null>(initial);

  const mut = useMutation({
    mutationFn: (force?: boolean) => genFn({ data: { scanId, force: !!force } }),
    onSuccess: (g) => {
      setGuide(g);
      qc.invalidateQueries({ queryKey: ["scan", scanId] });
      toast.success("Onboarding guide ready");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to generate"),
  });

  function downloadMd() {
    if (!guide) return;
    const md = `# Onboarding — ${repoLabel}\n\n${guide.welcome}\n\n## Prerequisites\n${guide.prerequisites.map((p) => `- ${p}`).join("\n")}\n\n## Setup steps\n${guide.setupSteps.map((s, i) => `${i + 1}. **${s.title}** — ${s.detail}`).join("\n")}\n\n## Key directories\n${guide.keyDirectories.map((d) => `- \`${d.path}\` — ${d.purpose}`).join("\n")}\n\n## First tasks\n${guide.firstTasks.map((t) => `- ${t}`).join("\n")}\n\n## Glossary\n${guide.glossary.map((g) => `- **${g.term}**: ${g.definition}`).join("\n")}\n\n## Resources\n${guide.resources.map((r) => `- ${r}`).join("\n")}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${repoLabel.replace("/", "-")}-onboarding.md`;
    a.click();
    URL.revokeObjectURL(u);
  }

  if (!guide) {
    return (
      <GlassCard glow className="p-12 text-center">
        <GraduationCap className="h-10 w-10 mx-auto text-primary" />
        <h2 className="mt-4 font-display text-2xl">Generate an onboarding guide</h2>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          DevFlow will brief a new engineer on this repo: setup steps, key directories, glossary, and good-first-issue ideas.
        </p>
        <Button variant="glow" className="mt-6" onClick={() => mut.mutate(false)} disabled={mut.isPending}>
          {mut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate guide</>}
        </Button>
      </GlassCard>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="glass" size="sm" onClick={downloadMd}>
          <Download className="h-3.5 w-3.5" /> Download .md
        </Button>
        <Button variant="glass" size="sm" onClick={() => mut.mutate(true)} disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
        </Button>
      </div>
      <GlassCard glow className="p-6">
        <div className="flex items-center gap-2 mb-2"><Rocket className="h-4 w-4 text-primary" /><span className="text-xs uppercase tracking-widest text-muted-foreground">Welcome</span></div>
        <p className="text-base leading-relaxed">{guide.welcome}</p>
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><ListChecks className="h-4 w-4 text-accent" /><h2 className="font-display text-xl">Prerequisites</h2></div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {guide.prerequisites.map((p, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-accent shrink-0" />{p}</li>)}
          </ul>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><FolderTree className="h-4 w-4 text-primary" /><h2 className="font-display text-xl">Key directories</h2></div>
          <ul className="space-y-2 text-sm">
            {guide.keyDirectories.map((d, i) => (
              <li key={i}>
                <code className="text-xs font-mono text-primary">{d.path}</code>
                <p className="text-xs text-muted-foreground mt-0.5">{d.purpose}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h2 className="font-display text-xl mb-3">Setup steps</h2>
        <ol className="space-y-3">
          {guide.setupSteps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs grid place-items-center font-display shrink-0">{i + 1}</span>
              <div>
                <div className="font-medium text-sm">{s.title}</div>
                <p className="text-sm text-muted-foreground mt-0.5">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <h2 className="font-display text-xl mb-3">First tasks</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {guide.firstTasks.map((t, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-success shrink-0" />{t}</li>)}
          </ul>
        </GlassCard>
        <GlassCard className="p-5">
          <h2 className="font-display text-xl mb-3">Glossary</h2>
          <dl className="space-y-2 text-sm">
            {guide.glossary.map((g, i) => (
              <div key={i}>
                <dt className="font-mono text-xs text-primary">{g.term}</dt>
                <dd className="text-xs text-muted-foreground">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </div>

      {guide.resources?.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3"><LinkIcon className="h-4 w-4 text-accent" /><h2 className="font-display text-xl">Resources</h2></div>
          <ul className="space-y-1.5 text-sm text-muted-foreground font-mono">
            {guide.resources.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </GlassCard>
      )}
    </motion.div>
  );
}

type ChatMsg = { id: string; role: "user" | "assistant"; text: string };

function ChatTab({ scanId, repoLabel }: { scanId: string; repoLabel: string }) {
  const historyFn = useServerFn(getChatHistory);
  const chatFn = useServerFn(chatWithRepo);
  const clearFn = useServerFn(clearChat);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["chat", scanId],
    queryFn: () => historyFn({ data: { scanId } }),
  });

  useEffect(() => {
    if (history) setMessages(history as ChatMsg[]);
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setInput("");
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setSending(true);
    try {
      const { answer } = await chatFn({ data: { scanId, message: text } });
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: answer }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Chat failed");
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
      setInput(text);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  const clearMut = useMutation({
    mutationFn: () => clearFn({ data: { scanId } }),
    onSuccess: () => {
      setMessages([]);
      qc.invalidateQueries({ queryKey: ["chat", scanId] });
      toast.success("Conversation cleared");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const suggestions = [
    "Give me the 60-second tour of this repo.",
    "Where does request handling start?",
    "What would a new contributor likely break first?",
    "Explain the data model.",
  ];

  return (
    <GlassCard className="p-0 overflow-hidden flex flex-col h-[640px]">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">Chat with {repoLabel}</span>
        </div>
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
                <AlertDialogDescription>All messages with {repoLabel} will be permanently deleted.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearMut.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.length === 0 && !sending ? (
          <div className="text-center max-w-md mx-auto">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <h2 className="mt-3 font-display text-xl">Ask anything about this repo</h2>
            <p className="text-sm text-muted-foreground mt-1">Grounded in the architecture, files, and risks DevFlow analyzed.</p>
            <div className="mt-5 grid gap-2 text-left">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-sm px-3 py-2 rounded-lg glass border-border hover:border-primary/40 transition-colors text-left">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground text-sm">
                  {m.text}
                </div>
              ) : (
                <div className="max-w-[88%]">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-widest mb-2">DevFlow AI</Badge>
                  <div className="prose prose-sm prose-invert max-w-none text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted/40 prose-code:px-1 prose-code:rounded prose-pre:bg-muted/40">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            aria-label="Ask a question about the repository"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about architecture, files, risks…"
            rows={1}
            className="resize-none min-h-[44px] max-h-40 bg-transparent"
            disabled={sending}
          />
          <Button onClick={() => send()} disabled={sending || !input.trim()} variant="glow" size="icon" className="h-11 w-11 shrink-0" aria-label="Send message">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
