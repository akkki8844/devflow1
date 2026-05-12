-- Remove unused plaintext PAT storage and tighten policies
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS github_pat;

CREATE POLICY "settings_delete_own"
ON public.user_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Explicit deny: chat_messages are immutable history; no updates allowed
CREATE POLICY "messages_no_update"
ON public.chat_messages
FOR UPDATE
USING (false)
WITH CHECK (false);