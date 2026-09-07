-- equipamento_montagens usa can_access_cliente(cliente_id) pra select/insert/
-- update, e can_access_cliente() ja foi estendida nesta sessao pra
-- pos_vendas/qualidade/compras/engenharia -- mas nao pra producao. Um
-- usuario so-production/assembly (que tem o modulo producao liberado por
-- padrao) passa na guarda de aplicacao (assertCanAccessModule(...,"producao")
-- em createMontagem/updateMontagem/removerMontagem) mas pode ser barrado
-- pela RLS se nao for tambem dono da oportunidade/processo/documento
-- daquele cliente -- mesma classe de bug ja corrigida em Chamados/SAT.

CREATE OR REPLACE FUNCTION public.can_access_cliente(_cliente_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = _cliente_id
      AND c.deleted_at IS NULL
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.oportunidades o
          WHERE o.cliente_id = c.id AND o.deleted_at IS NULL
            AND (o.responsavel_id = auth.uid() OR o.created_by = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.processos p
          WHERE p.cliente_id = c.id AND p.deleted_at IS NULL
            AND (p.pilar_id = auth.uid() OR p.created_by = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.cliente_sales_liberacao csl
          WHERE csl.cliente_id = c.id
            AND csl.sales_id = auth.uid()
            AND csl.revogado_em IS NULL
        )
        OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
        OR public.can_access_module(auth.uid(), 'qualidade'::public.app_module)
        OR public.can_access_module(auth.uid(), 'compras'::public.app_module)
        OR public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
        OR public.can_access_module(auth.uid(), 'producao'::public.app_module)
        OR EXISTS (
          SELECT 1 FROM public.sat_relatorio s
          WHERE s.cliente_id = c.id
            AND (s.created_by = auth.uid() OR auth.uid() = ANY(s.tecnico_ids))
        )
        OR EXISTS (
          SELECT 1 FROM public.documentos d
          WHERE d.cliente_id = c.id
            AND (d.created_by = auth.uid() OR d.responsavel_id = auth.uid())
        )
      )
  )
$$;
