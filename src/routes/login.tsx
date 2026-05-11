import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/devflow/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); return toast.error(error.message); }
    nav({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-10 flex justify-center"><Wordmark /></Link>
        <h1 className="text-2xl text-center mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Sign in to continue.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoFocus />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <Button type="submit" variant="glow" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground text-center">
          New here? <Link to="/signup" className="text-foreground hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
