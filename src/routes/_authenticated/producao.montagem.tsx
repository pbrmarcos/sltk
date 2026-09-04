import { createFileRoute } from "@tanstack/react-router";
import { MontagemListPage } from "@/components/producao/MontagemListPage";

export const Route = createFileRoute("/_authenticated/producao/montagem")({
  component: MontagemListPage,
});