import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Github, Loader2, Check, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getGithubConnection,
  startGithubOAuth,
  disconnectGithub,
} from "@/lib/github.functions";

export function GithubConnect({ compact = false }: { compact?: boolean }) {
  const getFn = useServerFn(getGithubConnection);
  const startFn = useServerFn(startGithubOAuth);
  const discFn = useServerFn(disconnectGithub);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["github-connection"],
    queryFn: () => getFn(),
  });

  const start = useMutation({
    mutationFn: async () => {
      const { url } = await startFn({ data: { origin: window.location.origin } });
      window.location.href = url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to start GitHub connection"),
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
    <Button
      variant="glass"
      size={compact ? "sm" : "default"}
      onClick={() => start.mutate()}
      disabled={start.isPending}
    >
      {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
      Connect GitHub
    </Button>
  );
}
