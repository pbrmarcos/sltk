-- O sidebar (AppSidebar.tsx) e o seed de role_module_permissions prometem
-- a tela "Chamados" ao papel field e "Relatórios SAT" ao papel sales, mas
-- a RLS de chamados/chamado_mensagens/chamado_eventos ficou travada em
-- has_role(admin/manager/engineer) desde a criação da tabela, e a de
-- sat_relatorio_insert não inclui sales. Resultado prático: field vê o
-- menu "Chamados" mas toda query/gravação falha por RLS; sales vê o menu
-- "Relatórios SAT" mas não consegue nem criar um relatório.
--
-- A migration 20260907120000_unificar_liberacao_e_travar_clientes.sql já
-- documentou esse problema (comentário) e corrigiu só o acesso à ficha de
-- cliente via can_access_module(pos_vendas) -- esta migration corrige a
-- causa raiz nas próprias tabelas de chamados/sat_relatorio, com o mesmo
-- padrão.

DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados FOR SELECT USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
  OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
);

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados FOR UPDATE USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
  OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
);

DROP POLICY IF EXISTS "chamados_insert" ON public.chamados;
CREATE POLICY "chamados_insert" ON public.chamados FOR INSERT WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
  OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
);

DROP POLICY IF EXISTS "chamado_msg_select" ON public.chamado_mensagens;
CREATE POLICY "chamado_msg_select" ON public.chamado_mensagens FOR SELECT USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
  OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
);
DROP POLICY IF EXISTS "chamado_msg_insert" ON public.chamado_mensagens;
CREATE POLICY "chamado_msg_insert" ON public.chamado_mensagens FOR INSERT WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
  OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
);

DROP POLICY IF EXISTS "chamado_ev_select" ON public.chamado_eventos;
CREATE POLICY "chamado_ev_select" ON public.chamado_eventos FOR SELECT USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
  OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
);
DROP POLICY IF EXISTS "chamado_ev_insert" ON public.chamado_eventos;
CREATE POLICY "chamado_ev_insert" ON public.chamado_eventos FOR INSERT WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
  OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
);

DROP POLICY IF EXISTS "sat_relatorio_insert" ON public.sat_relatorio;
CREATE POLICY "sat_relatorio_insert" ON public.sat_relatorio
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.has_role(auth.uid(), 'field'::app_role)
      OR public.has_role(auth.uid(), 'engineer'::app_role)
      OR public.has_role(auth.uid(), 'assembly'::app_role)
      OR public.can_access_module(auth.uid(), 'pos_vendas'::public.app_module)
    )
  );
