import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/comercial/formularios-rfq")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/comercial/checklists", search: search as never, replace: true });
  },
});
