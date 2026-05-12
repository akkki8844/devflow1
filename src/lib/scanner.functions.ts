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

    if (error) throw new Error(error.message);

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
    if (error) throw new Error(error.message);
    return data ?? [];
  });
