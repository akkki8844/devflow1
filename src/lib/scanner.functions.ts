import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const inputSchema = z.object({ repoUrl: z.string().url().max(300) });

function parseRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

const analysisSchema = z.object({
  summary: z.string(),
  architecture: z.string(),
  techStack: z.array(z.string()),
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
  };
};

async function ghFetch(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "DevFlow-AI" },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Repository not found. Make sure it's public and the URL is correct.");
    if (res.status === 403) throw new Error("GitHub rate limit reached. Try again in a minute.");
    if (res.status === 451) throw new Error("Repository is unavailable for legal reasons.");
    throw new Error(`GitHub error (${res.status}). Please try a different repository.`);
  }
  return res.json();
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

    // 1. Fetch repo metadata
    const meta = (await ghFetch(`/repos/${parsed.owner}/${parsed.repo}`)) as any;

    // 2. Fetch tree
    let tree: any = { tree: [] };
    try {
      tree = await ghFetch(
        `/repos/${parsed.owner}/${parsed.repo}/git/trees/${meta.default_branch}?recursive=1`,
      );
    } catch {
      /* large repos may 409 */
    }
    const files: string[] = (tree.tree ?? [])
      .filter((n: any) => n.type === "blob")
      .map((n: any) => n.path as string);

    const topFiles = files.slice(0, 60);
    const samplePaths = files.slice(0, 200).join("\n");

    // 3. AI analysis
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    let output: z.infer<typeof analysisSchema>;
    try {
      const schemaShape = `{
  "summary": string,
  "architecture": string,
  "techStack": string[],
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
        system:
          "You are a senior staff engineer analyzing a public GitHub repository. Produce a precise, opinionated technical breakdown. Be specific to the actual files and stack. No filler. Always respond with ONLY a single valid JSON object that matches the requested schema. No markdown fences, no commentary.",
        prompt: `Repository: ${meta.full_name}
Description: ${meta.description ?? "—"}
Primary language: ${meta.language ?? "unknown"}
Stars: ${meta.stargazers_count} • Forks: ${meta.forks_count}
Topics: ${(meta.topics ?? []).join(", ") || "—"}

File tree sample (${files.length} files total):
${samplePaths}

Return JSON matching exactly this shape:
${schemaShape}

complexity is 0-100 (higher = more complex). healthScore is 0-100 (higher = healthier). Include 3-6 items in each list. securityWarnings may be empty.`,
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
      },
    };

    // 4. Persist
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
          "You are a senior engineer onboarding a new hire to an unfamiliar repository. Produce a warm, specific, actionable onboarding guide grounded in the actual repo. Respond with ONLY valid JSON, no markdown fences.",
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
        system: `You are an expert engineer who has deeply analyzed this repository. Answer concisely and specifically, referencing real files and concepts from the context. Use markdown. If you don't know, say so.\n\nREPO CONTEXT:\n${ctx}`,
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
