import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/devflow/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined,
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) { setLoading(false); return toast.error(signInErr.message); }
    }
    nav({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-10 flex justify-center"><Wordmark /></Link>
        <h1 className="text-2xl text-center mb-1">Create account</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Get started in seconds.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input aria-label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus />
          <Input aria-label="Password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <Button type="submit" variant="glow" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Continue"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          Have an account? <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
