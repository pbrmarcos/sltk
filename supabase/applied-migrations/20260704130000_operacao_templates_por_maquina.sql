-- 3.2 — Templates de projeto por máquina + vínculo RFQ→Oportunidade.
-- Extende processo_templates com rfq_tipo_id (default por máquina) e
-- oportunidades com rfq_submissao_id (submissão que originou o pedido).
-- Seed: um template projeto por tipo de máquina, com tarefas e eventos
-- padrão (Kickoff, Projeto Mecânico, Projeto Elétrico, Compras, Montagem,
-- Comissionamento, FAT).

------------------------------------------------------------------------
-- 1) Colunas
------------------------------------------------------------------------
ALTER TABLE public.processo_templates
  ADD COLUMN IF NOT EXISTS rfq_tipo_id uuid REFERENCES public.rfq_formulario_tipo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processo_templates_rfq_tipo
  ON public.processo_templates(rfq_tipo_id) WHERE rfq_tipo_id IS NOT NULL;

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS rfq_submissao_id uuid REFERENCES public.rfq_submissao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_rfq_submissao
  ON public.oportunidades(rfq_submissao_id) WHERE rfq_submissao_id IS NOT NULL;

------------------------------------------------------------------------
-- 2) Seed dos 5 templates de projeto, um por tipo de máquina.
--    Idempotente: usa nome como chave lógica; recria tarefas/eventos.
------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  tpl_id uuid;
BEGIN
  FOR r IN
    SELECT id, codigo, nome_pt
    FROM public.rfq_formulario_tipo
    WHERE codigo IN (
      'empacotamento_termoformado',
      'envasadora_linear',
      'rotuladora',
      'paletizadora',
      'checkweigher'
    )
  LOOP
    SELECT id INTO tpl_id
    FROM public.processo_templates
    WHERE nome = 'Máquina — ' || r.nome_pt
      AND tipo = 'projeto'::processo_tipo
    LIMIT 1;

    IF tpl_id IS NULL THEN
      INSERT INTO public.processo_templates (nome, descricao, tipo, ativo, rfq_tipo_id)
      VALUES (
        'Máquina — ' || r.nome_pt,
        'Template padrão do projeto de ' || r.nome_pt || '. Ajuste as etapas conforme o produto real.',
        'projeto'::processo_tipo,
        true,
        r.id
      )
      RETURNING id INTO tpl_id;
    ELSE
      UPDATE public.processo_templates
      SET rfq_tipo_id = r.id,
          descricao = COALESCE(descricao, 'Template padrão do projeto de ' || r.nome_pt || '.'),
          ativo = true,
          updated_at = now()
      WHERE id = tpl_id;
    END IF;

    DELETE FROM public.processo_template_tarefas WHERE template_id = tpl_id;
    DELETE FROM public.processo_template_eventos WHERE template_id = tpl_id;
    INSERT INTO public.processo_template_tarefas (template_id, ordem, titulo, descricao, dias_apos_inicio, responsavel_role) VALUES
      (tpl_id, 1, 'Kickoff de operação', 'Reunião inicial com cliente para alinhar escopo, marcos e responsáveis.', 0, 'manager'),
      (tpl_id, 2, 'Projeto Mecânico — proposta', 'Elaboração da proposta mecânica com base no formulário RFQ.', 5, 'engineer'),
      (tpl_id, 3, 'Projeto Elétrico — proposta', 'Elaboração da proposta elétrica e arquitetura de controle.', 7, 'engineer'),
      (tpl_id, 4, 'Aprovação do projeto pelo cliente', 'Envio dos projetos mecânico e elétrico para aprovação formal.', 15, 'manager'),
      (tpl_id, 5, 'B.O.M. e solicitações de compra', 'Consolidação do B.O.M. e emissão das solicitações por criticidade.', 20, 'engineer'),
      (tpl_id, 6, 'Compras e recebimento', 'Aprovação de ordens, follow-up com fornecedores e recebimento.', 25, 'purchasing'),
      (tpl_id, 7, 'Fabricação e montagem', 'Fabricação de peças, montagem mecânica e elétrica em fábrica.', 40, 'assembly'),
      (tpl_id, 8, 'Comissionamento interno', 'Testes elétricos, funcionais e integração antes do FAT.', 65, 'production'),
      (tpl_id, 9, 'FAT — Factory Acceptance Test', 'Execução do FAT com o cliente. Aceite e ajustes.', 80, 'field'),
      (tpl_id, 10, 'Expedição e instalação', 'Preparo para expedição, transporte e instalação no site.', 90, 'field');
    INSERT INTO public.processo_template_eventos (template_id, ordem, titulo, tipo, dias_apos_inicio) VALUES
      (tpl_id, 1, 'Kickoff', 'kickoff', 0),
      (tpl_id, 2, 'Aprovação Mecânica', 'outro', 15),
      (tpl_id, 3, 'Aprovação Elétrica', 'outro', 15),
      (tpl_id, 4, 'Corte de compras', 'outro', 25),
      (tpl_id, 5, 'Início do FAT', 'embarque', 80),
      (tpl_id, 6, 'Entrega no cliente', 'embarque', 100);
  END LOOP;
END $$;
