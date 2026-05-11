import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
export const getRouter = () => {
  if (typeof window !== "undefined") {
    import("./integrations/supabase/server-fn-fetch.client").then((m) =>
      m.installServerFnAuthFetch(),
    );
  }
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
