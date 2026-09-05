-- Templates de planejamento de equipamento (híbrido: derivado de rfq_formulario_tipo + editável)
-- + colunas de responsáveis e orcamento em cliente_equipamentos.

ALTER TABLE public.cliente_equipamentos
  ADD COLUMN IF NOT EXISTS oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel_engenharia_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel_automacao_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planejamento_template_slug text,
  ADD COLUMN IF NOT EXISTS clonado_de_equipamento_id uuid REFERENCES public.cliente_equipamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resumo text;

CREATE INDEX IF NOT EXISTS idx_cliente_equipamentos_oportunidade
  ON public.cliente_equipamentos(oportunidade_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.equipamento_planejamento_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  familia text,
  descricao text,
  tipo_rfq_id uuid REFERENCES public.rfq_formulario_tipo(id) ON DELETE SET NULL,
  publicado boolean NOT NULL DEFAULT true,
  versao int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_planejamento_templates TO authenticated;
GRANT ALL ON public.equipamento_planejamento_templates TO service_role;
ALTER TABLE public.equipamento_planejamento_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "templates leitura autenticada" ON public.equipamento_planejamento_templates;
CREATE POLICY "templates leitura autenticada" ON public.equipamento_planejamento_templates
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "templates admin escrita" ON public.equipamento_planejamento_templates;
CREATE POLICY "templates admin escrita" ON public.equipamento_planejamento_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TABLE IF NOT EXISTS public.equipamento_planejamento_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.equipamento_planejamento_templates(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  area text NOT NULL DEFAULT 'engenharia',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planej_secoes_template ON public.equipamento_planejamento_secoes(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_planejamento_secoes TO authenticated;
GRANT ALL ON public.equipamento_planejamento_secoes TO service_role;
ALTER TABLE public.equipamento_planejamento_secoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secoes leitura autenticada" ON public.equipamento_planejamento_secoes;
CREATE POLICY "secoes leitura autenticada" ON public.equipamento_planejamento_secoes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "secoes admin escrita" ON public.equipamento_planejamento_secoes;
CREATE POLICY "secoes admin escrita" ON public.equipamento_planejamento_secoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TABLE IF NOT EXISTS public.equipamento_planejamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao_id uuid NOT NULL REFERENCES public.equipamento_planejamento_secoes(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'checklist',
  titulo text NOT NULL,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planej_itens_secao ON public.equipamento_planejamento_itens(secao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_planejamento_itens TO authenticated;
GRANT ALL ON public.equipamento_planejamento_itens TO service_role;
ALTER TABLE public.equipamento_planejamento_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "itens leitura autenticada" ON public.equipamento_planejamento_itens;
CREATE POLICY "itens leitura autenticada" ON public.equipamento_planejamento_itens
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "itens admin escrita" ON public.equipamento_planejamento_itens;
CREATE POLICY "itens admin escrita" ON public.equipamento_planejamento_itens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE TABLE IF NOT EXISTS public.equipamento_planejamento_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.equipamento_planejamento_itens(id) ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false,
  valor text,
  done_at timestamptz,
  done_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  done_by_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipamento_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_planej_status_eqp ON public.equipamento_planejamento_status(equipamento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_planejamento_status TO authenticated;
GRANT ALL ON public.equipamento_planejamento_status TO service_role;
ALTER TABLE public.equipamento_planejamento_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planej status leitura autenticada" ON public.equipamento_planejamento_status;
CREATE POLICY "planej status leitura autenticada" ON public.equipamento_planejamento_status
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "planej status escrita autenticada" ON public.equipamento_planejamento_status;
CREATE POLICY "planej status escrita autenticada" ON public.equipamento_planejamento_status
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.equipamento_planejamento_templates (slug, nome, familia, descricao, tipo_rfq_id)
SELECT
  COALESCE(NULLIF(t.slug, ''), lower(regexp_replace(t.nome_pt, '[^a-zA-Z0-9]+', '-', 'g'))) AS slug,
  t.nome_pt,
  t.familia::text,
  COALESCE(t.descricao,
    'Template de planejamento para ' || t.nome_pt || '. Perguntas iniciais derivadas do formulário RFQ, expandíveis pelo time.'),
  t.id
FROM public.rfq_formulario_tipo t
WHERE t.ativo = true
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.equipamento_planejamento_templates (slug, nome, familia, descricao, tipo_rfq_id)
VALUES (
  'desenvolvimento-modelo',
  'Desenvolvimento Modelo',
  'customizado',
  'Template amplo para máquinas fora do catálogo dos 25 modelos. Cobre função, capacidade, dimensões, utilidades, integrações e normas — expanda conforme o projeto.',
  NULL
) ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  v_tpl RECORD;
  v_sec_id uuid;
BEGIN
  FOR v_tpl IN
    SELECT t.id, t.slug, t.nome
      FROM public.equipamento_planejamento_templates t
      WHERE NOT EXISTS (SELECT 1 FROM public.equipamento_planejamento_secoes s WHERE s.template_id = t.id)
  LOOP
    INSERT INTO public.equipamento_planejamento_secoes (template_id, ordem, titulo, area)
      VALUES (v_tpl.id, 1, 'Mecânica', 'engenharia') RETURNING id INTO v_sec_id;
    INSERT INTO public.equipamento_planejamento_itens (secao_id, ordem, tipo, titulo, descricao, obrigatorio) VALUES
      (v_sec_id, 1, 'checklist', 'Definir capacidade nominal', 'Produtos/h ou kg/h contratados no orçamento.', true),
      (v_sec_id, 2, 'checklist', 'Definir dimensões e footprint', 'Área ocupada, altura livre e acessos.', true),
      (v_sec_id, 3, 'checklist', 'Materiais em contato com produto', 'Inox 304/316, food-grade, borrachas.', true),
      (v_sec_id, 4, 'checklist', 'Layout preliminar aprovado pelo cliente', NULL, false),
      (v_sec_id, 5, 'bom_sugerido', 'B.O.M. mecânico base', 'Estrutura, transportadores, guias, moto-redutores.', false);

    INSERT INTO public.equipamento_planejamento_secoes (template_id, ordem, titulo, area)
      VALUES (v_tpl.id, 2, 'Elétrica', 'automacao') RETURNING id INTO v_sec_id;
    INSERT INTO public.equipamento_planejamento_itens (secao_id, ordem, tipo, titulo, descricao, obrigatorio) VALUES
      (v_sec_id, 1, 'checklist', 'Tensão e frequência de alimentação', '220/380/440 V — 50/60 Hz.', true),
      (v_sec_id, 2, 'checklist', 'Potência instalada estimada', 'kVA / kW total.', true),
      (v_sec_id, 3, 'checklist', 'Painel elétrico dimensionado', 'IP, ventilação, disjuntores.', false),
      (v_sec_id, 4, 'bom_sugerido', 'B.O.M. elétrico base', 'Painel, cabos, sensores, botoeiras.', false);

    INSERT INTO public.equipamento_planejamento_secoes (template_id, ordem, titulo, area)
      VALUES (v_tpl.id, 3, 'Automação e CLP', 'automacao') RETURNING id INTO v_sec_id;
    INSERT INTO public.equipamento_planejamento_itens (secao_id, ordem, tipo, titulo, descricao, obrigatorio) VALUES
      (v_sec_id, 1, 'checklist', 'CLP e IHM definidos', 'Marca, modelo, protocolo.', true),
      (v_sec_id, 2, 'checklist', 'Integração com linha existente', 'Protocolo, tags, handshake.', false),
      (v_sec_id, 3, 'checklist', 'Receitas e formatos', NULL, false);

    INSERT INTO public.equipamento_planejamento_secoes (template_id, ordem, titulo, area)
      VALUES (v_tpl.id, 4, 'Montagem e Campo', 'engenharia') RETURNING id INTO v_sec_id;
    INSERT INTO public.equipamento_planejamento_itens (secao_id, ordem, tipo, titulo, descricao, obrigatorio) VALUES
      (v_sec_id, 1, 'checklist', 'Plano de embarque acordado', 'Datas, transporte, Incoterm.', false),
      (v_sec_id, 2, 'checklist', 'Comissionamento previsto', 'Equipe, dias, custos.', false);

    INSERT INTO public.equipamento_planejamento_secoes (template_id, ordem, titulo, area)
      VALUES (v_tpl.id, 5, 'Qualidade e Documentação', 'qualidade') RETURNING id INTO v_sec_id;
    INSERT INTO public.equipamento_planejamento_itens (secao_id, ordem, tipo, titulo, descricao, obrigatorio) VALUES
      (v_sec_id, 1, 'checklist', 'FAT — critérios de aceitação', NULL, true),
      (v_sec_id, 2, 'checklist', 'Certificados e normas aplicáveis', 'NR-10, NR-12, CE, etc.', false),
      (v_sec_id, 3, 'checklist', 'Manuais e desenhos as-built', NULL, false);

    INSERT INTO public.equipamento_planejamento_secoes (template_id, ordem, titulo, area)
      VALUES (v_tpl.id, 6, 'Pós-venda', 'pos_venda') RETURNING id INTO v_sec_id;
    INSERT INTO public.equipamento_planejamento_itens (secao_id, ordem, tipo, titulo, descricao, obrigatorio) VALUES
      (v_sec_id, 1, 'checklist', 'Garantia contratada', 'Duração e escopo.', true),
      (v_sec_id, 2, 'checklist', 'Peças de reposição críticas', NULL, false),
      (v_sec_id, 3, 'checklist', 'Treinamento de operadores', NULL, false);
  END LOOP;
END $$;
