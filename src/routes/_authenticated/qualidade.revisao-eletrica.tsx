import { createFileRoute } from "@tanstack/react-router";
import { RevisoesListPage } from "@/components/qualidade/RevisoesListPage";

export const Route = createFileRoute("/_authenticated/qualidade/revisao-eletrica")({
  component: () => <RevisoesListPage disciplina="eletrica" />,
});
