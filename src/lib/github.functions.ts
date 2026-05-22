import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type GithubConnection = {
  connected: boolean;
  login: string | null;
  avatar_url: string | null;
  scope: string | null;
  connected_at: string | null;
};

export const getGithubConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GithubConnection> => {
    const { data, error } = await context.supabase
      .from("github_connections" as any)
      .select("github_login, avatar_url, scope, connected_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("[getGithubConnection] DB error:", error.message);
      return { connected: false, login: null, avatar_url: null, scope: null, connected_at: null };
    }
    if (!data) return { connected: false, login: null, avatar_url: null, scope: null, connected_at: null };
    const row = data as any;
    return {
      connected: true,
      login: row.github_login ?? null,
      avatar_url: row.avatar_url ?? null,
      scope: row.scope ?? null,
      connected_at: row.connected_at ?? null,
    };
  });

export const startGithubOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ origin: z.string().url().max(300) }).parse(d))
  .handler(async ({ context, data }) => {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    if (!clientId) throw new Error("GitHub OAuth is not configured.");

    const state = crypto.randomUUID();
    const { error: insertErr } = await supabaseAdmin
      .from("github_oauth_states" as any)
      .insert({ state, user_id: context.userId });
    if (insertErr) {
      console.error("[startGithubOAuth] state insert error:", insertErr.message);
      throw new Error("Failed to start GitHub connection. Please try again.");
    }

    // Best-effort cleanup of old state rows (>15 min)
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await supabaseAdmin.from("github_oauth_states" as any).delete().lt("created_at", cutoff);

    const redirectUri = `${data.origin}/api/public/github/callback`;
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "repo read:user");
    url.searchParams.set("state", state);
    url.searchParams.set("allow_signup", "true");
    return { url: url.toString() };
  });

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("github_connections" as any)
      .delete()
      .eq("user_id", context.userId);
    if (error) {
      console.error("[disconnectGithub] DB error:", error.message);
      throw new Error("Failed to disconnect GitHub. Please try again.");
    }
    return { ok: true };
  });

export const listMyRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conn } = await supabaseAdmin
      .from("github_connections" as any)
      .select("access_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    const token = (conn as any)?.access_token;
    if (!token) return [];

    try {
      const res = await fetch(
        "https://api.github.com/user/repos?per_page=50&sort=updated&affiliation=owner,collaborator,organization_member",
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `token ${token}`,
            "User-Agent": "DevFlow-AI",
          },
        },
      );
      if (!res.ok) return [];
      const repos = (await res.json()) as any[];
      return repos.map((r) => ({
        fullName: r.full_name as string,
        url: r.html_url as string,
        private: !!r.private,
        description: (r.description as string | null) ?? null,
        stars: (r.stargazers_count as number) ?? 0,
        language: (r.language as string | null) ?? null,
        updatedAt: (r.updated_at as string) ?? null,
      }));
    } catch (e) {
      console.error("[listMyRepos] fetch error:", e);
      return [];
    }
  });
