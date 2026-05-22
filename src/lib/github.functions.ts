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

export const saveGithubPat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        token: z
          .string()
          .trim()
          .min(20, "Token looks too short")
          .max(255)
          .regex(/^[A-Za-z0-9_\-]+$/, "Invalid token format"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Validate the PAT by hitting /user
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${data.token}`,
        "User-Agent": "DevFlow-AI",
      },
    });
    if (res.status === 401) throw new Error("Invalid token. Check that it hasn't expired.");
    if (!res.ok) throw new Error("GitHub rejected the token. Please try again.");
    const user = (await res.json()) as any;
    const scope = res.headers.get("x-oauth-scopes") ?? "";

    const { error } = await supabaseAdmin.from("github_connections" as any).upsert(
      {
        user_id: context.userId,
        access_token: data.token,
        github_login: user.login ?? null,
        github_user_id: user.id ?? null,
        avatar_url: user.avatar_url ?? null,
        scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("[saveGithubPat] DB error:", error.message);
      throw new Error("Failed to save token. Please try again.");
    }
    return { ok: true, login: user.login as string };
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
            Authorization: `Bearer ${token}`,
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
