import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GridBackground } from "@/components/devflow/grid-background";
import { GlassCard } from "@/components/devflow/glass-card";
import { Wordmark } from "@/components/devflow/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined,
        data: { display_name: name },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    if (!data.session) {
      // Fallback: attempt immediate sign-in (auto-confirm is enabled)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) { setLoading(false); return toast.error(signInErr.message); }
    }
    setLoading(false);
    toast.success("Welcome to DevFlow");
    nav({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen grid place-items-center px-4 py-10">
      <GridBackground />
      <GlassCard glow className="w-full max-w-md p-8">
        <Link to="/" className="mb-8 inline-block"><Wordmark /></Link>
        <h1 className="text-3xl">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-2">Start analyzing repositories in seconds.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="glow" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already have an account? <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
        </p>
      </GlassCard>
    </div>
  );
}
