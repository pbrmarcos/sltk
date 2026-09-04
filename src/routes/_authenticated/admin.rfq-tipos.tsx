import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/rfq-tipos")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/checklist-tipos", replace: true });
  },
});
