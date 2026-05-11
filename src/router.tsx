import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { routeTree } from "./routeTree.gen";

const installAuthFetch = createIsomorphicFn()
  .server(() => {})
  .client(() => {
    import("./integrations/supabase/server-fn-fetch.client").then((m) =>
      m.installServerFnAuthFetch(),
    );
  });

export const getRouter = () => {
  installAuthFetch();
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
