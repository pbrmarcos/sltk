import { createFileRoute, Navigate } from "@tanstack/react-router";

// O detalhe de qualquer documento agora vive em /documentos/$id (tipo-agnóstico),
// com breadcrumb dinâmico baseado em documento.tipo_codigo. Mantemos esta rota
// como redirect client-side para preservar links antigos, sem afetar a rota-filha
// /comercial/orcamento/$id/corrigir (que continua válida).
export const Route = createFileRoute("/_authenticated/comercial/orcamento/$id")({
  component: RedirectToDocumento,
});

function RedirectToDocumento() {
  const { id } = Route.useParams();
  return <Navigate to="/documentos/$id" params={{ id }} replace />;
}
