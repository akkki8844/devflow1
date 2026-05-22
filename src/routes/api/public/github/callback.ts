import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function errorRedirect(origin: string, msg: string) {
  const url = new URL("/scanner", origin);
  url.searchParams.set("github", "error");
  url.searchParams.set("reason", msg);
  return Response.redirect(url.toString(), 302);
}

export const Route = createFileRoute("/api/public/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const reqUrl = new URL(request.url);
        const origin = reqUrl.origin;
        const code = reqUrl.searchParams.get("code");
        const state = reqUrl.searchParams.get("state");

        if (!code || !state) return errorRedirect(origin, "missing_params");

        // Validate state and look up the originating user
        const { data: stateRow, error: stateErr } = await supabaseAdmin
          .from("github_oauth_states" as any)
          .select("user_id, created_at")
          .eq("state", state)
          .maybeSingle();
        if (stateErr || !stateRow) {
          console.error("[github/callback] state lookup failed", stateErr?.message);
          return errorRedirect(origin, "invalid_state");
        }
        const row = stateRow as any;
        const ageMs = Date.now() - new Date(row.created_at).getTime();
        if (ageMs > 15 * 60 * 1000) {
          await supabaseAdmin.from("github_oauth_states" as any).delete().eq("state", state);
          return errorRedirect(origin, "expired_state");
        }

        // One-time use: delete the state immediately
        await supabaseAdmin.from("github_oauth_states" as any).delete().eq("state", state);

        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) return errorRedirect(origin, "not_configured");

        // Exchange code for token
        let token = "";
        let scope = "";
        try {
          const tokRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "User-Agent": "DevFlow-AI",
            },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              redirect_uri: `${origin}/api/public/github/callback`,
            }),
          });
          if (!tokRes.ok) {
            console.error("[github/callback] token exchange failed", tokRes.status);
            return errorRedirect(origin, "token_exchange_failed");
          }
          const tokJson = (await tokRes.json()) as any;
          if (tokJson.error) {
            console.error("[github/callback] token exchange error", tokJson.error);
            return errorRedirect(origin, "token_exchange_error");
          }
          token = tokJson.access_token;
          scope = tokJson.scope ?? "";
        } catch (e) {
          console.error("[github/callback] token fetch threw", e);
          return errorRedirect(origin, "network_error");
        }

        // Fetch user profile to store login/avatar
        let login: string | null = null;
        let avatar_url: string | null = null;
        let github_user_id: number | null = null;
        try {
          const userRes = await fetch("https://api.github.com/user", {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `token ${token}`,
              "User-Agent": "DevFlow-AI",
            },
          });
          if (userRes.ok) {
            const u = (await userRes.json()) as any;
            login = u.login ?? null;
            avatar_url = u.avatar_url ?? null;
            github_user_id = u.id ?? null;
          }
        } catch (e) {
          console.error("[github/callback] user fetch failed", e);
        }

        // Upsert connection
        const { error: upErr } = await supabaseAdmin
          .from("github_connections" as any)
          .upsert(
            {
              user_id: row.user_id,
              access_token: token,
              scope,
              github_login: login,
              avatar_url,
              github_user_id,
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        if (upErr) {
          console.error("[github/callback] upsert failed", upErr.message);
          return errorRedirect(origin, "save_failed");
        }

        const successUrl = new URL("/scanner", origin);
        successUrl.searchParams.set("github", "connected");
        return Response.redirect(successUrl.toString(), 302);
      },
    },
  },
});
