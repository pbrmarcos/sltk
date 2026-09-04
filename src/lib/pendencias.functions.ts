import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnySb = any;

async function countHead(sb: AnySb, table: string, apply: (q: any) => any) {
  try {
    const base = sb.from(table).select("*", { count: "exact", head: true });
    const { count, error } = await apply(base);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Retorna contagem de "informações pendentes" por rota da sidebar.
 * As chaves batem com `item.to` do AppSidebar.
 */
export const getPendenciasSidebar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as AnySb;

    const [
      clientesSemCnpj,
      fornecedoresSemCnpj,
      oportunidadesAbertas,
      ordensRascunho,
      cotacoesAbertas,
      chamadosAbertos,
      chamadosNovos,
      chamadosContato,
      chamadosSlaEstourado,
      fatRascunho,
      satRascunho,
      orcamentosRascunho,
    ] = await Promise.all([
      countHead(sb, "clientes", (q) => q.or("cnpj.is.null,cnpj.eq.")),
      countHead(sb, "fornecedores", (q) => q.or("cnpj.is.null,cnpj.eq.")),
      countHead(sb, "oportunidades", (q) => q.eq("status", "aberto")),
      countHead(sb, "ordens_compra", (q) => q.eq("status", "rascunho")),
      countHead(sb, "cotacoes", (q) => q.eq("status", "aberta")),
      countHead(sb, "chamados", (q) => q.not("status", "in", "(resolvido,arquivado)")),
      countHead(sb, "chamados", (q) => q.eq("ultima_mensagem_por", "visitante").not("status", "in", "(resolvido,arquivado)")),
      countHead(sb, "chamados", (q) => q.eq("origem", "contato_site").not("status", "in", "(resolvido,arquivado)")),
      countHead(sb, "chamados", (q) =>
        q.is("first_response_at", null)
         .lt("sla_resposta_at", new Date().toISOString())
         .not("status", "in", "(resolvido,arquivado)")
      ),
      countHead(sb, "fat_relatorios", (q) => q.eq("status", "rascunho")),
      countHead(sb, "sat_relatorio", (q) => q.eq("status", "rascunho")),
      countHead(sb, "documentos", (q) => q.eq("tipo", "orcamento").eq("status", "rascunho")),
    ]);

    const chamadosTotal = chamadosAbertos;
    const map: Record<string, number> = {
      "/clientes": clientesSemCnpj,
      "/fornecedores": fornecedoresSemCnpj,
      "/comercial/pipeline": oportunidadesAbertas,
      "/comercial/orcamento": orcamentosRascunho,
      "/compras/ordens": ordensRascunho,
      "/compras/solicitacao": cotacoesAbertas,
      "/pos-vendas/chamados": chamadosTotal,
      "/pos-vendas/sat": satRascunho,
      "/qualidade/fat": fatRascunho,
    };

    type Detail = { label: string; count: number };
    const details: Record<string, Detail[]> = {
      "/clientes": [{ label: "Clientes sem CNPJ", count: clientesSemCnpj }],
      "/fornecedores": [{ label: "Fornecedores sem CNPJ", count: fornecedoresSemCnpj }],
      "/comercial/pipeline": [{ label: "Oportunidades abertas", count: oportunidadesAbertas }],
      "/comercial/orcamento": [{ label: "Orçamentos em rascunho", count: orcamentosRascunho }],
      "/compras/ordens": [{ label: "Ordens em rascunho", count: ordensRascunho }],
      "/compras/solicitacao": [{ label: "Cotações abertas", count: cotacoesAbertas }],
      "/pos-vendas/chamados": [
        { label: "Chamados abertos", count: chamadosAbertos },
        { label: "Aguardando resposta interna", count: chamadosNovos },
        { label: "Mensagens do site", count: chamadosContato },
        { label: "SLA estourado", count: chamadosSlaEstourado },
      ],
      "/pos-vendas/sat": [{ label: "SAT em rascunho", count: satRascunho }],
      "/qualidade/fat": [{ label: "FAT em rascunho", count: fatRascunho }],
    };

    return { map, details };
  });
