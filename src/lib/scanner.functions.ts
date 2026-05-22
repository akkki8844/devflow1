import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const inputSchema = z.object({ repoUrl: z.string().url().max(300) });

function parseRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

// Names we MUST NOT surface in tech-stack output (per product requirement)
const BOT_BLOCKLIST = [
  "lovable",
  "claude",
  "cursor",
  "copilot",
  "v0",
  "v0.dev",
  "bolt",
  "bolt.new",
  "devin",
  "anthropic",
  "openai",
  "gpt",
  "chatgpt",
  "replit agent",
  "windsurf",
  "codeium",
  "ai builder",
  "ai assistant",
  "ai coding",
  "lovable-tagger",
];

function stripBotMentions<T extends string>(arr: T[]): T[] {
  return arr.filter((s) => {
    const lower = String(s).toLowerCase();
    return !BOT_BLOCKLIST.some((b) => lower.includes(b));
  });
}

const techStackDetailedSchema = z.object({
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  libraries: z.array(z.string()).default([]),
  buildTools: z.array(z.string()).default([]),
  testing: z.array(z.string()).default([]),
  infrastructure: z.array(z.string()).default([]),
  databases: z.array(z.string()).default([]),
});
export type TechStackDetailed = z.infer<typeof techStackDetailedSchema>;

const analysisSchema = z.object({
  summary: z.string(),
  architecture: z.string(),
  techStack: z.array(z.string()),
  techStackDetailed: techStackDetailedSchema,
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  securityWarnings: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      title: z.string(),
      description: z.string(),
    }),
  ),
  suggestions: z.array(z.string()),
  optimizations: z.array(z.string()),
  complexity: z.number().min(0).max(100),
  healthScore: z.number().min(0).max(100),
});

export type ScanResults = z.infer<typeof analysisSchema> & {
  repo: {
    fullName: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
    topics: string[];
    defaultBranch: string;
    fileCount: number;
    topFiles: string[];
    isPrivate?: boolean;
    languages?: Record<string, number>;
  };
};

async function ghFetch(path: string, token?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DevFlow-AI",
  };
  if (token) headers["Authorization"] = `token ${token}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    if (res.status === 404)
      throw new Error(
        token
          ? "Repository not found, or your GitHub account doesn't have access to it."
          : "Repository not found. If it's private, connect GitHub first.",
      );
    if (res.status === 401) throw new Error("GitHub token rejected. Reconnect GitHub and try again.");
    if (res.status === 403) throw new Error("GitHub rate limit reached. Try again in a minute.");
    if (res.status === 451) throw new Error("Repository is unavailable for legal reasons.");
    throw new Error(`GitHub error (${res.status}). Please try a different repository.`);
  }
  return res.json();
}

async function ghFetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token?: string | null,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.raw",
      "User-Agent": "DevFlow-AI",
    };
    if (token) headers["Authorization"] = `token ${token}`;
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      { headers },
    );
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 8000); // cap each manifest at 8KB
  } catch {
    return null;
  }
}

async function getUserGithubToken(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("github_connections" as any)
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).access_token ?? null;
}

export const scanRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const parsed = parseRepo(data.repoUrl);
    if (!parsed) throw new Error("Invalid GitHub URL");

    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // 0. Use user's GitHub token if linked (enables private repos + higher rate limits)
    const token = await getUserGithubToken(userId);

    // 1. Fetch repo metadata
    const meta = (await ghFetch(`/repos/${parsed.owner}/${parsed.repo}`, token)) as any;

    // 2. Fetch tree
    let tree: any = { tree: [] };
    try {
      tree = await ghFetch(
        `/repos/${parsed.owner}/${parsed.repo}/git/trees/${meta.default_branch}?recursive=1`,
        token,
      );
    } catch {
      /* large repos may 409 */
    }
    const files: string[] = (tree.tree ?? [])
      .filter((n: any) => n.type === "blob")
      .map((n: any) => n.path as string);

    const topFiles = files.slice(0, 60);
    const samplePaths = files.slice(0, 200).join("\n");

    // 3. Languages breakdown (bytes per language)
    let languages: Record<string, number> = {};
    try {
      languages = (await ghFetch(
        `/repos/${parsed.owner}/${parsed.repo}/languages`,
        token,
      )) as Record<string, number>;
    } catch {
      /* ignore */
    }

    // 4. Fetch root dependency manifests for accurate stack detection
    const manifestCandidates = [
      "package.json",
      "requirements.txt",
      "pyproject.toml",
      "Pipfile",
      "go.mod",
      "Cargo.toml",
      "Gemfile",
      "composer.json",
      "build.gradle",
      "build.gradle.kts",
      "pom.xml",
      "Package.swift",
      "pubspec.yaml",
      "Dockerfile",
      "docker-compose.yml",
      "docker-compose.yaml",
      ".tool-versions",
      "vite.config.ts",
      "vite.config.js",
      "next.config.js",
      "next.config.mjs",
      "next.config.ts",
      "tsconfig.json",
      "wrangler.toml",
      "wrangler.jsonc",
      "netlify.toml",
      "vercel.json",
    ];
    const presentManifests = manifestCandidates.filter((p) => files.includes(p));
    const manifestSnippets: { path: string; content: string }[] = [];
    for (const p of presentManifests.slice(0, 10)) {
      const content = await ghFetchRawFile(parsed.owner, parsed.repo, meta.default_branch, p, token);
      if (content) manifestSnippets.push({ path: p, content });
    }
    const manifestsBlock = manifestSnippets
      .map((m) => `===== ${m.path} =====\n${m.content}`)
      .join("\n\n");

    // 5. AI analysis
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    let output: z.infer<typeof analysisSchema>;
    try {
      const schemaShape = `{
  "summary": string,
  "architecture": string,
  "techStack": string[],            // flat list, every concrete tech used
  "techStackDetailed": {
    "languages": string[],          // e.g. ["TypeScript","Python","Go"]
    "frameworks": string[],         // e.g. ["Next.js","FastAPI","Express"]
    "libraries": string[],          // major runtime libs (React Query, Zod, lodash, ...)
    "buildTools": string[],         // e.g. ["Vite","Webpack","esbuild","Turbo","Bun"]
    "testing": string[],            // e.g. ["Vitest","Jest","Playwright","pytest"]
    "infrastructure": string[],     // e.g. ["Docker","Cloudflare Workers","Vercel","Kubernetes","GitHub Actions"]
    "databases": string[]           // e.g. ["PostgreSQL","Redis","SQLite","Supabase"]
  },
  "strengths": string[],
  "risks": string[],
  "securityWarnings": [{ "severity": "low"|"medium"|"high", "title": string, "description": string }],
  "suggestions": string[],
  "optimizations": string[],
  "complexity": number (0-100),
  "healthScore": number (0-100)
}`;

      const result = await generateText({
        model,
        system: `You are a senior staff engineer analyzing a GitHub repository. Produce a precise, opinionated technical breakdown grounded in the ACTUAL files, dependency manifests, and language byte breakdown provided. Be specific and accurate — no filler, no guesses.

CRITICAL TECH STACK RULES — read carefully:
- Only list technologies that the SOURCE CODE itself uses (languages, frameworks, libraries, build tools, runtimes, databases, infra, CI).
- DO NOT include any AI coding tools, AI assistants, AI code generators, or "AI-builder" platforms in techStack or techStackDetailed. Specifically forbidden: Lovable, lovable-tagger, Claude, Cursor, GitHub Copilot, v0, Bolt, Devin, Replit Agent, Windsurf, Codeium, ChatGPT, GPT, OpenAI, Anthropic. Even if you see traces in commits or comments, omit them.
- Prefer items you can verify from the manifests and language stats. Skip items you only assume.
- Use proper canonical names (e.g. "React", "Next.js", "PostgreSQL", "Tailwind CSS").

Always respond with ONLY a single valid JSON object that matches the requested schema. No markdown fences, no commentary.`,
        prompt: `Repository: ${meta.full_name}${meta.private ? " (PRIVATE)" : ""}
Description: ${meta.description ?? "—"}
Primary language (GitHub): ${meta.language ?? "unknown"}
Stars: ${meta.stargazers_count} • Forks: ${meta.forks_count}
Topics: ${(meta.topics ?? []).join(", ") || "—"}

Language byte breakdown (from GitHub /languages):
${Object.entries(languages).map(([k, v]) => `  ${k}: ${v}`).join("\n") || "  (none reported)"}

File tree sample (${files.length} files total):
${samplePaths}

Dependency manifests (verbatim, truncated):
${manifestsBlock || "(no recognizable manifests found at root)"}

Return JSON matching exactly this shape:
${schemaShape}

complexity is 0-100 (higher = more complex). healthScore is 0-100 (higher = healthier). Include 3-6 items in each list. securityWarnings may be empty. In techStackDetailed, every array may be empty if not applicable, but populate everything you can verify from the manifests/files.`,
      });

      const raw = result.text ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI returned no JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      output = analysisSchema.parse(parsed);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      console.error("[scanner] AI analysis failed:", msg);
      if (msg.includes("429")) throw new Error("AI is busy right now. Please retry in a few seconds.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error("AI analysis failed: " + msg.slice(0, 200));
    }

    // Post-filter: strip any bot mentions that slipped through, in all stack arrays
    output.techStack = stripBotMentions(output.techStack);
    output.techStackDetailed = {
      languages: stripBotMentions(output.techStackDetailed.languages),
      frameworks: stripBotMentions(output.techStackDetailed.frameworks),
      libraries: stripBotMentions(output.techStackDetailed.libraries),
      buildTools: stripBotMentions(output.techStackDetailed.buildTools),
      testing: stripBotMentions(output.techStackDetailed.testing),
      infrastructure: stripBotMentions(output.techStackDetailed.infrastructure),
      databases: stripBotMentions(output.techStackDetailed.databases),
    };

    const results: ScanResults = {
      ...output,
      repo: {
        fullName: meta.full_name,
        description: meta.description,
        stars: meta.stargazers_count,
        forks: meta.forks_count,
        language: meta.language,
        topics: meta.topics ?? [],
        defaultBranch: meta.default_branch,
        fileCount: files.length,
        topFiles,
        isPrivate: !!meta.private,
        languages,
      },
    };

    // 6. Persist
    const { data: row, error } = await supabase
      .from("repo_scans")
      .insert({
        user_id: userId,
        repo_url: data.repoUrl,
        repo_name: parsed.repo,
        owner: parsed.owner,
        summary: output.summary,
        status: "completed",
        results: results as any,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[scanRepository] DB insert error:", error.message);
      throw new Error("Failed to save scan. Please try again.");
    }

    return { id: row.id, results };
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("repo_scans")
      .select("id, repo_url, repo_name, owner, summary, created_at, results")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("[listScans] DB error:", error.message);
      throw new Error("Failed to load scans. Please try again.");
    }
    return data ?? [];
  });

export const deleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("repo_scans")
      .delete()
      .eq("id", data.id);
    if (error) {
      console.error("[deleteScan] DB error:", error.message);
      throw new Error("Failed to delete scan. Please try again.");
    }
    return { ok: true };
  });

export const getScan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("repo_scans")
      .select("id, repo_url, repo_name, owner, summary, created_at, results")
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getScan] DB error:", error.message);
      throw new Error("Failed to load scan. Please try again.");
    }
    return row ?? null;
  });

const onboardingSchema = z.object({
  welcome: z.string(),
  prerequisites: z.array(z.string()),
  setupSteps: z.array(z.object({ title: z.string(), detail: z.string() })),
  keyDirectories: z.array(z.object({ path: z.string(), purpose: z.string() })),
  firstTasks: z.array(z.string()),
  glossary: z.array(z.object({ term: z.string(), definition: z.string() })),
  resources: z.array(z.string()),
});
export type OnboardingGuide = z.infer<typeof onboardingSchema>;

export const generateOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ scanId: z.string().uuid(), force: z.boolean().optional() }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: row, error } = await supabase
      .from("repo_scans")
      .select("id, results, repo_name, owner")
      .eq("id", data.scanId)
      .maybeSingle();
    if (error || !row) throw new Error("Scan not found");

    const results = row.results as any;
    if (results?.onboarding && !data.force) return results.onboarding as OnboardingGuide;

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const shape = `{
  "welcome": string,
  "prerequisites": string[],
  "setupSteps": [{ "title": string, "detail": string }],
  "keyDirectories": [{ "path": string, "purpose": string }],
  "firstTasks": string[],
  "glossary": [{ "term": string, "definition": string }],
  "resources": string[]
}`;

    let guide: OnboardingGuide;
    try {
      const r = await generateText({
        model,
        system:
          "You are a senior engineer onboarding a new hire to an unfamiliar repository. Produce a warm, specific, actionable onboarding guide grounded in the actual repo. Do NOT mention any AI coding tools or AI-builder platforms (Lovable, Claude, Cursor, Copilot, v0, Bolt, etc.). Respond with ONLY valid JSON, no markdown fences.",
        prompt: `Repo: ${row.owner}/${row.repo_name}
Summary: ${results?.summary ?? ""}
Architecture: ${results?.architecture ?? ""}
Tech stack: ${(results?.techStack ?? []).join(", ")}
Top files: ${(results?.repo?.topFiles ?? []).slice(0, 50).join("\n")}

Return JSON matching:
${shape}
Include 4-6 setupSteps, 4-8 keyDirectories with real paths from the file list, 4-6 firstTasks (good-first-issue ideas), 4-8 glossary terms specific to this codebase, 3-6 resources (commands, docs URLs, file links).`,
      });
      const m = (r.text ?? "").match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned no JSON");
      guide = onboardingSchema.parse(JSON.parse(m[0]));
    } catch (e: any) {
      throw new Error("Onboarding generation failed: " + String(e?.message ?? e).slice(0, 200));
    }

    await supabase
      .from("repo_scans")
      .update({ results: { ...results, onboarding: guide } as any })
      .eq("id", row.id)
      .eq("user_id", userId);

    return guide;
  });

export const chatWithRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      scanId: z.string().uuid(),
      message: z.string().min(1).max(4000),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: scan, error: sErr } = await supabase
      .from("repo_scans")
      .select("id, repo_name, owner, results")
      .eq("id", data.scanId)
      .maybeSingle();
    if (sErr || !scan) throw new Error("Scan not found");

    // Find or create thread
    let threadId: string;
    const { data: existing } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("repo_scan_id", scan.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      threadId = existing.id;
    } else {
      const { data: t, error: tErr } = await supabase
        .from("chat_threads")
        .insert({
          user_id: userId,
          repo_scan_id: scan.id,
          title: `${scan.owner}/${scan.repo_name}`,
        })
        .select("id")
        .single();
      if (tErr) {
        console.error("[chatWithRepo] thread insert error:", tErr.message);
        throw new Error("Failed to start chat. Please try again.");
      }
      threadId = t.id;
    }

    // Load history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    // Save user message
    await supabase.from("chat_messages").insert({
      user_id: userId,
      thread_id: threadId,
      role: "user",
      parts: [{ type: "text", text: data.message }] as any,
    });

    const results = scan.results as any;
    const ctx = `Repository: ${scan.owner}/${scan.repo_name}
Summary: ${results?.summary ?? ""}
Architecture: ${results?.architecture ?? ""}
Tech stack: ${(results?.techStack ?? []).join(", ")}
Strengths: ${(results?.strengths ?? []).join("; ")}
Risks: ${(results?.risks ?? []).join("; ")}
Top files: ${(results?.repo?.topFiles ?? []).slice(0, 80).join(", ")}`;

    const priorMessages = (history ?? []).map((h: any) => ({
      role: h.role as "user" | "assistant",
      content: (h.parts ?? [])
        .map((p: any) => (p?.type === "text" ? p.text : ""))
        .join(""),
    }));

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    let answer = "";
    try {
      const r = await generateText({
        model,
        system: `You are an expert engineer who has deeply analyzed this repository. Answer concisely and specifically, referencing real files and concepts from the context. Use markdown. If you don't know, say so. Do NOT mention any AI coding tools or AI-builder platforms in your answers.\n\nREPO CONTEXT:\n${ctx}`,
        messages: [
          ...priorMessages,
          { role: "user", content: data.message },
        ],
      });
      answer = r.text ?? "";
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("429")) throw new Error("AI is busy. Retry shortly.");
      if (msg.includes("402")) throw new Error("AI credits exhausted.");
      throw new Error("Chat failed: " + msg.slice(0, 200));
    }

    await supabase.from("chat_messages").insert({
      user_id: userId,
      thread_id: threadId,
      role: "assistant",
      parts: [{ type: "text", text: answer }] as any,
    });

    return { threadId, answer };
  });

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ scanId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("repo_scan_id", data.scanId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!thread) return [];
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    return (msgs ?? []).map((m: any) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      text: (m.parts ?? [])
        .map((p: any) => (p?.type === "text" ? p.text : ""))
        .join(""),
      created_at: m.created_at,
    }));
  });

export const clearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ scanId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("repo_scan_id", data.scanId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!thread) return { ok: true };
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("thread_id", thread.id);
    if (error) {
      console.error("[clearChat] DB error:", error.message);
      throw new Error("Failed to clear chat. Please try again.");
    }
    return { ok: true };
  });
