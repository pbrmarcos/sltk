-- Unifica os dois mecanismos de "liberação" de cliente que hoje não se
-- conversam (cliente_sales_liberacao, usada só pra emissão de Checklist, e
-- can_access_cliente(), usada em equipamentos/documentos/timeline com sua
-- própria regra de dono de oportunidade/processo) e passa a exigir a mesma
-- checagem também na ficha básica do cliente (tabela clientes), que hoje não
-- tem trava de dono nenhuma.
--
-- Antes de travar a ficha básica, um levantamento completo de todo acesso a
-- `clientes` fora do Comercial mostrou que a regra original de
-- can_access_cliente() (só admin/manager + dono de oportunidade/processo)
-- quebraria Suporte (lista fica vazia) e degradaria silenciosamente (campo
-- cliente vira null, sem erro) em Qualidade/FAT, SAT (técnico designado que
-- não é o criador) e Compras/Engenharia — essas áreas já enxergam suas
-- próprias tabelas (ordens_compra, projeto_insumos, insumo_*, fat_relatorios)
-- por módulo, sem checar dono. As cláusulas abaixo replicam esse mesmo
-- modelo pra manter consistência, em vez de criar uma trava mais restrita só
-- na ficha do cliente que o resto do sistema não usa.

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
        OR EXISTS (
          SELECT 1 FROM public.sat_relatorio s
          WHERE s.cliente_id = c.id
            AND (s.created_by = auth.uid() OR auth.uid() = ANY(s.tecnico_ids))
        )
      )
  )
$$;

-- pode_ver_cliente() vira um alias fino de can_access_cliente() — mesma
-- checagem, sem duplicar a regra num segundo lugar. O parâmetro _uid é
-- ignorado porque toda chamada existente já passa auth.uid().
CREATE OR REPLACE FUNCTION public.pode_ver_cliente(_uid uuid, _cliente uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.can_access_cliente(_cliente);
$$;

-- Trava a ficha básica do cliente com a mesma regra.
DROP POLICY IF EXISTS clientes_select_auth ON public.clientes;
CREATE POLICY clientes_select_auth ON public.clientes
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(id));

DROP POLICY IF EXISTS clientes_update_roles ON public.clientes;
CREATE POLICY clientes_update_roles ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'sales'::app_role)
    )
    AND public.can_access_cliente(id)
  )
  WITH CHECK (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'sales'::app_role)
    )
    AND public.can_access_cliente(id)
  );
