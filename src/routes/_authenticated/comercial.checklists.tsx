import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  submissao: fallback(z.string().uuid().optional(), undefined).default(undefined),
});

/** Rota antiga: a inbox de checklists vive em Comercial → Formulários. */
export const Route = createFileRoute("/_authenticated/comercial/checklists")({
  validateSearch: zodValidator(searchSchema),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/comercial/formularios",
      search: { aba: "checklists", submissao: search.submissao },
    });
  },
});
