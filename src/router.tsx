import { MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

/**
 * Rede de segurança: toda gravação que falhar sem um `onError` próprio mostra
 * um aviso. Antes, várias ações (arquivar fornecedor, editar etapas, revogar
 * acesso…) falhavam em silêncio e o usuário achava que tinha salvado.
 */
function avisarErroDeGravacao(error: unknown) {
  const msg =
    error instanceof Error && error.message
      ? error.message
      : "Não foi possível concluir a ação. Tente novamente.";
  if (typeof window !== "undefined") toast.error(msg);
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.onError) return; // a tela já trata
        avisarErroDeGravacao(error);
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
