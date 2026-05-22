import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Github, Loader2, Check, Unlink, KeyRound, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getGithubConnection,
  saveGithubPat,
  disconnectGithub,
} from "@/lib/github.functions";

export function GithubConnect({ compact = false }: { compact?: boolean }) {
  const getFn = useServerFn(getGithubConnection);
  const saveFn = useServerFn(saveGithubPat);
  const discFn = useServerFn(disconnectGithub);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["github-connection"],
    queryFn: () => getFn(),
  });

  const save = useMutation({
    mutationFn: async (t: string) => saveFn({ data: { token: t } }),
    onSuccess: (res) => {
      toast.success(`Connected as @${res.login}`);
      setToken("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["github-connection"] });
      qc.invalidateQueries({ queryKey: ["github-my-repos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save token"),
  });

  const disc = useMutation({
    mutationFn: () => discFn(),
    onSuccess: () => {
      toast.success("GitHub disconnected");
      qc.invalidateQueries({ queryKey: ["github-connection"] });
      qc.invalidateQueries({ queryKey: ["github-my-repos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to disconnect"),
  });

  if (isLoading) {
    return (
      <Button variant="glass" size={compact ? "sm" : "default"} disabled>
        <Loader2 className="h-4 w-4 animate-spin" /> GitHub
      </Button>
    );
  }

  if (data?.connected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 h-9 rounded-md glass text-sm">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="h-5 w-5 rounded-full" />
          ) : (
            <Github className="h-4 w-4" />
          )}
          <span className="text-muted-foreground hidden sm:inline">@</span>
          <span className="truncate max-w-[10rem]">{data.login}</span>
          <Check className="h-3.5 w-3.5 text-success" />
        </div>
        {!compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disc.mutate()}
            disabled={disc.isPending}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Disconnect GitHub"
          >
            {disc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glass" size={compact ? "sm" : "default"}>
          <Github className="h-4 w-4" />
          Connect GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Connect with a Personal Access Token
          </DialogTitle>
          <DialogDescription>
            Paste a GitHub PAT to scan private and organization repositories. The token is stored
            encrypted and only used to read repo contents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <a
            href="https://github.com/settings/tokens/new?description=DevFlow%20AI&scopes=repo,read:user"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Create a new token <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="text-xs text-muted-foreground">
            Required scopes: <code className="px-1 py-0.5 rounded bg-muted">repo</code> and{" "}
            <code className="px-1 py-0.5 rounded bg-muted">read:user</code>. Classic or
            fine-grained tokens both work.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!token.trim()) return toast.error("Paste your token first");
              save.mutate(token.trim());
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              aria-label="GitHub Personal Access Token"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save & verify
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
