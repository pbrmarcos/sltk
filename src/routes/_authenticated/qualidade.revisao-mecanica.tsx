import { createFileRoute } from "@tanstack/react-router";
import { RevisoesListPage } from "@/components/qualidade/RevisoesListPage";

export const Route = createFileRoute("/_authenticated/qualidade/revisao-mecanica")({
  component: () => <RevisoesListPage disciplina="mecanica" />,
});
