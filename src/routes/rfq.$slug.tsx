import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rfq/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/checklist/$slug", params: { slug: params.slug }, replace: true });
  },
});
