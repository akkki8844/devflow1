-- Store per-user GitHub OAuth tokens for private repo access
CREATE TABLE public.github_connections (
  user_id UUID NOT NULL PRIMARY KEY,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  github_login TEXT,
  github_user_id BIGINT,
  avatar_url TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own connection metadata (token still exposed only via server fn, but RLS gates it)
CREATE POLICY "github_select_own"
ON public.github_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "github_insert_own"
ON public.github_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "github_update_own"
ON public.github_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "github_delete_own"
ON public.github_connections FOR DELETE
USING (auth.uid() = user_id);

-- Short-lived OAuth state tokens to prevent CSRF on the callback
CREATE TABLE public.github_oauth_states (
  state TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.github_oauth_states ENABLE ROW LEVEL SECURITY;

-- No client access; only the service-role server route reads/writes this
CREATE POLICY "oauth_states_no_client_access"
ON public.github_oauth_states FOR ALL
USING (false) WITH CHECK (false);

CREATE INDEX github_oauth_states_created_at_idx ON public.github_oauth_states (created_at);