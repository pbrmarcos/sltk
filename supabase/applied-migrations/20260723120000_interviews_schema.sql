-- ==============================================================
-- 20260723120000_interviews_schema.sql
-- Módulo Entrevistas: schema + seed do catálogo (41 segmentos)
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.entrevista_segmentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome_pt text NOT NULL,
  nome_es text,
  nome_en text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entrevista_segmentos TO anon, authenticated;
GRANT ALL ON public.entrevista_segmentos TO service_role;
ALTER TABLE public.entrevista_segmentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seg_read_all" ON public.entrevista_segmentos;
CREATE POLICY "seg_read_all" ON public.entrevista_segmentos FOR SELECT USING (true);
DROP POLICY IF EXISTS "seg_admin_write" ON public.entrevista_segmentos;
CREATE POLICY "seg_admin_write" ON public.entrevista_segmentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.entrevista_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segmento_id uuid NOT NULL REFERENCES public.entrevista_segmentos(id) ON DELETE CASCADE,
  numero int NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  formato text NOT NULL DEFAULT 'multi_choice',
  enunciado_pt text NOT NULL,
  enunciado_es text,
  enunciado_en text,
  obrigatoria boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (segmento_id, numero)
);
CREATE INDEX IF NOT EXISTS entrevista_perguntas_seg_idx ON public.entrevista_perguntas(segmento_id, ordem);
GRANT SELECT ON public.entrevista_perguntas TO anon, authenticated;
GRANT ALL ON public.entrevista_perguntas TO service_role;
ALTER TABLE public.entrevista_perguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perg_read_all" ON public.entrevista_perguntas;
CREATE POLICY "perg_read_all" ON public.entrevista_perguntas FOR SELECT USING (true);
DROP POLICY IF EXISTS "perg_admin_write" ON public.entrevista_perguntas;
CREATE POLICY "perg_admin_write" ON public.entrevista_perguntas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.entrevista_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id uuid NOT NULL REFERENCES public.entrevista_perguntas(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  label_pt text NOT NULL,
  label_es text,
  label_en text,
  tem_descricao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entrevista_opcoes_perg_idx ON public.entrevista_opcoes(pergunta_id, ordem);
GRANT SELECT ON public.entrevista_opcoes TO anon, authenticated;
GRANT ALL ON public.entrevista_opcoes TO service_role;
ALTER TABLE public.entrevista_opcoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "opc_read_all" ON public.entrevista_opcoes;
CREATE POLICY "opc_read_all" ON public.entrevista_opcoes FOR SELECT USING (true);
DROP POLICY IF EXISTS "opc_admin_write" ON public.entrevista_opcoes;
CREATE POLICY "opc_admin_write" ON public.entrevista_opcoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.entrevistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  segmento_id uuid NOT NULL REFERENCES public.entrevista_segmentos(id),
  criado_por uuid NOT NULL,
  lead_nome text,
  lead_email text,
  lead_empresa text,
  idioma_default text NOT NULL DEFAULT 'pt',
  status text NOT NULL DEFAULT 'pendente',
  respondida_em timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pendente','respondida','expirada')),
  CHECK (idioma_default IN ('pt','es','en'))
);
CREATE INDEX IF NOT EXISTS entrevistas_criado_por_idx ON public.entrevistas(criado_por);
CREATE INDEX IF NOT EXISTS entrevistas_codigo_idx ON public.entrevistas(codigo);
GRANT SELECT, INSERT, UPDATE ON public.entrevistas TO authenticated;
GRANT ALL ON public.entrevistas TO service_role;
ALTER TABLE public.entrevistas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entrev_select_own_or_admin" ON public.entrevistas;
CREATE POLICY "entrev_select_own_or_admin" ON public.entrevistas FOR SELECT TO authenticated
  USING (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
DROP POLICY IF EXISTS "entrev_insert_sales" ON public.entrevistas;
CREATE POLICY "entrev_insert_sales" ON public.entrevistas FOR INSERT TO authenticated
  WITH CHECK (
    criado_por = auth.uid() AND (
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'manager') OR
      public.has_role(auth.uid(),'sales')
    )
  );
DROP POLICY IF EXISTS "entrev_update_own_or_admin" ON public.entrevistas;
CREATE POLICY "entrev_update_own_or_admin" ON public.entrevistas FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE TABLE IF NOT EXISTS public.entrevista_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrevista_id uuid NOT NULL REFERENCES public.entrevistas(id) ON DELETE CASCADE,
  pergunta_id uuid NOT NULL REFERENCES public.entrevista_perguntas(id),
  valor_text text,
  valor_options jsonb,
  descricao_extra text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entrevista_id, pergunta_id)
);
CREATE INDEX IF NOT EXISTS entrevista_respostas_ent_idx ON public.entrevista_respostas(entrevista_id);
GRANT SELECT ON public.entrevista_respostas TO authenticated;
GRANT ALL ON public.entrevista_respostas TO service_role;
ALTER TABLE public.entrevista_respostas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resp_select_via_entrev" ON public.entrevista_respostas;
CREATE POLICY "resp_select_via_entrev" ON public.entrevista_respostas FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.entrevistas e WHERE e.id = entrevista_id
      AND (e.criado_por = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  ));

-- Eventos de e-mail
INSERT INTO public.email_event_config (event_key, module, label, enabled, subject_template, body_template, required_vars)
VALUES
  ('entrevista.criada','comercial','Entrevista criada', true,
    '[SLTK] Entrevista criada — {{codigo}} ({{segmento}})',
    '<p>Olá {{criador_nome}},</p><p>A entrevista <b>{{codigo}}</b> do segmento <b>{{segmento}}</b> foi criada.</p><p>Link público: <a href="{{link_publico}}">{{link_publico}}</a></p>',
    ARRAY['codigo','segmento','link_publico','criador_nome']::text[]),
  ('entrevista.enviada','comercial','Entrevista enviada ao lead', true,
    '[SLTK] Entrevista {{codigo}} — {{segmento}}',
    '<p>Olá {{lead_nome|Prezado(a)}},</p><p>Segue o link para responder a entrevista técnica do segmento <b>{{segmento}}</b>:</p><p><a href="{{link_publico}}">{{link_publico}}</a></p><p>Atenciosamente,<br/>{{criador_nome}}</p>',
    ARRAY['codigo','segmento','link_publico','criador_nome']::text[]),
  ('entrevista.respondida','comercial','Entrevista respondida', true,
    '[SLTK] Entrevista respondida — {{codigo}} ({{segmento}})',
    '<p>A entrevista <b>{{codigo}}</b> do segmento <b>{{segmento}}</b> foi respondida{{#if lead_nome}} por {{lead_nome}}{{/if}}.</p><p>Ver respostas: <a href="{{link_detalhe}}">{{link_detalhe}}</a></p>',
    ARRAY['codigo','segmento','link_detalhe']::text[]),
  ('entrevista.expirada','comercial','Entrevista expirada', true,
    '[SLTK] Entrevista expirada — {{codigo}}',
    '<p>A entrevista <b>{{codigo}}</b> ({{segmento}}) foi marcada como expirada e não aceita mais respostas.</p>',
    ARRAY['codigo','segmento']::text[])
ON CONFLICT (event_key) DO UPDATE
  SET module=EXCLUDED.module, label=EXCLUDED.label,
      subject_template=EXCLUDED.subject_template,
      body_template=EXCLUDED.body_template,
      required_vars=EXCLUDED.required_vars;

INSERT INTO public.email_event_recipients (event_key, role, mode) VALUES
  ('entrevista.respondida','manager','cc'),
  ('entrevista.respondida','admin','cc')
ON CONFLICT DO NOTHING;

-- ===== Amendoin =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('amendoin', 'Amendoin', 1) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipo de grãos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Amendoim', false), (2, 'Amendoim Sem Casca', false), (3, 'Amendoim Sem Pelicula', false), (4, 'Pasta de Amendoim', false), (5, 'Amendoim Snack', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza Limpeza ou Beneficia os Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa realiza algum processo de extração de Óleo ou Farinha?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Sua empresa Realiza Torrefação dos Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Sua empresa Trabalha com produtos industrializados de Amendoim?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Não', false), (2, 'Sim, compramos prontos e envasamos pasta', false), (3, 'Sim, compramos prontos e embalado, somente distribuímos', false), (4, 'Sim, temos processo de pasta de amendoim', false), (5, 'Sim, temos processo de snack', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pounch', false), (3, 'Saco', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'textarea', 'A Linha de Limpeza, Secagem, Armazenamento e Beneficiamento, Torrefação, Moagem, Transporte, etc, tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 15, 15, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='amendoin')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 17, 16, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Arroz =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('arroz', 'Arroz', 2) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipo de grãos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Arroz em Casca', false), (2, 'Arroz Partido', false), (3, 'Arroz Parboilizado', false), (4, 'Arroz Branco', false), (5, 'Farinha de Arroz', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza Limpeza ou Beneficia os Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa realiza algum processo de extração de Óleo ou Farinha?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pounch', false), (3, 'Saco', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'textarea', 'A Linha de Limpeza, Secagem, Armazenamento e Beneficiamento tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='arroz')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Automotivo =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('automotivo', 'Automotivo', 3) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos Automotivos sua empresa produz?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Aditivos', false), (2, 'Desengraxantes', false), (3, 'Lubrificantes', false), (4, 'Detergentes', false), (5, 'Fluido Para Brisa', false), (6, 'Ceras', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Potes', false), (2, 'Frascos', false), (3, 'Cartuchos', false), (4, 'Caixas', false), (5, 'Caixas com Saco Plastico Interno', false), (6, 'Potes', false), (7, 'Latas', false), (8, 'Outros', false), (9, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois da embalagem primaria, que tipo de embalagem secundária utiliza no processo Fardos, Caixas, Cartuchos, Pallet?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Cartuchos', false), (3, 'Caixas', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='automotivo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Azeites, Gorduras e Vinagres =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('azeites-gorduras-e-vinagres', 'Azeites, Gorduras e Vinagres', 4) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa produz?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Azeite semente', false), (2, 'Azeite Oliva', false), (3, 'Óleo Vegetal', false), (4, 'Óleo Mineral', false), (5, 'Óleo Animal', false), (6, 'Gorduras', false), (7, 'Banha', false), (8, 'Vinagres', false), (9, 'Vinagre Balsámico', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false), (3, 'Qual o projeto?', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo Pacotes, Sacos, Frascos, Potes, Caixas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Potes', false), (2, 'Frascos', false), (3, 'Cartuchos', false), (4, 'Caixas', false), (5, 'Caixas com Saco Plastico Interno', false), (6, 'Latas', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primaria, que tipo de embalagem secundária utiliza no processo Fardos, Caixas, Cartuchos, Pallet?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Cartuchos', false), (3, 'Caixas', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='azeites-gorduras-e-vinagres')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Açucar =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('acucar', 'Açucar', 5) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipo de grãos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Açucar Cristal', false), (2, 'Açucar Mascavo', false), (3, 'Açucar Demerara', false), (4, 'Açucar Confeiteiro', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza Limpeza ou Beneficia os Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e revende', false), (3, 'Sim', false), (4, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 4, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 5, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 6, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sache', false), (2, 'Stickpack', false), (3, 'Pacotes', false), (4, 'Pounch', false), (5, 'Sacos', false), (6, 'Big Bag', false), (7, 'Caixas', false), (8, 'Potes', false), (9, 'Frascos', false), (10, 'Cartuchos', false), (11, 'Outros', false), (12, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 7, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Cartuchos de Sachets/Stickpacks', false), (3, 'Bandejas', false), (4, 'Sacos', false), (5, 'Big Bag', false), (6, 'Caixas', false), (7, 'Pallets', false), (8, 'Outros', false), (9, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 8, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 9, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 10, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 11, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='acucar')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 12, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Biomassa, Carvões e Chip Lenha =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('biomassa-carvoes-e-chip-lenha', 'Biomassa, Carvões e Chip Lenha', 6) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa produz?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Biomassa', false), (2, 'Carvões', false), (3, 'Chip Lenha', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de qualidade no processo para separação de produto por tamanho, padronização?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false), (3, 'Manual', false), (4, 'Utiliza selecionadora mecanica por tamanho?', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false), (3, 'Qual o projeto?', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da produção, que tipo de embalagem utiliza para despacho Sacos, Big Bag, Fardos, Caixas, Pallet?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Sacos', false), (3, 'Caixas', false), (4, 'Pacotes', false), (5, 'Cartuchos', false), (6, 'Big Bag', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='biomassa-carvoes-e-chip-lenha')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Bolachas =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('bolachas', 'Bolachas', 7) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Com que tipos de Bolachas trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Bolacha Normal', false), (2, 'Bolacha Recheada', false), (3, 'Bolacha Salgada', false), (4, 'Cookies', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa Realiza fabricação de bolacha?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente Empacota e revende ou recebe e Revende', false), (3, 'Processo é automatico', false), (4, 'Processo é manual', false), (5, 'Processo é semi-automatico', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa Realiza processo de formação das bolachas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Sua empresa Realiza processo de assado das bolachas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Tem algum processo de Inspeção de qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de peso', false), (2, 'Detecção de metais', false), (3, 'Raio-X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Cartuchos', false), (3, 'Sacos', false), (4, 'big bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Pounch', false), (9, 'Flowpack', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Pallet', false), (4, 'Caixas', false), (5, 'Sacos', false), (6, 'Big bag', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='bolachas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Café =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('cafe', 'Café', 8) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipo de grãos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Café', false), (2, 'Café Torrado e moído', false), (3, 'Café Liofilizado', false), (4, 'Café Torrado', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza Limpeza ou Beneficia os Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa Realiza Torrefação dos Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Sua empresa Realiza Moagem dos Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Sua empresa Trabalha com Café Liofilizado?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Não', false), (2, 'Sim, compramos prontos e envasamos', false), (3, 'Sim, compramos prontos e embalado, somente distribuímos', false), (4, 'Sim, temos processo de liofilização interna', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Tem algum processo de Inspeção de qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de peso', false), (2, 'Detecção de metais', false), (3, 'Raio-X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Sachet', false), (3, 'Cartuchos', false), (4, 'Stickpack', false), (5, 'Pounch / Doypack', false), (6, 'Frascos', false), (7, 'Potes', false), (8, 'Caixas', false), (9, 'big bag', false), (10, 'Sacos', false), (11, 'Outros', false), (12, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big bag', false), (5, 'Cartuchos', false), (6, 'Caixas', false), (7, 'Pallet', false), (8, 'Outros', false), (9, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'textarea', 'A Linha de Limpeza, Secagem, Armazenamento e Beneficiamento, Torrefação, Moagem, Transporte, etc, tem algum tipo de automação por computador ou depende de funcionários? Descrever o processo de transporte' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 15, 15, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cafe')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 16, 16, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Cereais matinais e granolas =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('cereais-matinais-e-granolas', 'Cereais matinais e granolas', 9) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipo de grãos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Cereais Matinais', false), (2, 'Granolas', false), (3, 'Outros', false), (4, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa Industrializa o próprio produto?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false), (3, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Tem algum processo de Inspeção de qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de peso', false), (2, 'Detecção de metais', false), (3, 'Raio-X', false), (4, 'Inspeção de Produção por Balança de Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Sachet', false), (3, 'Pounch', false), (4, 'Frascos', false), (5, 'Potes', false), (6, 'Caixas', false), (7, 'Big Bag', false), (8, 'Sacos', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Big bag', false), (4, 'Sacos', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='cereais-matinais-e-granolas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Chocolates, Balas e Guloseimas =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('chocolates-balas-e-guloseimas', 'Chocolates, Balas e Guloseimas', 10) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa produz?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Chocolates', false), (2, 'Bombons', false), (3, 'Barras', false), (4, 'Balas', false), (5, 'Chicletes', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo de fabricação, que tipo de embalagem primária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Flowpack', false), (3, 'Fardos', false), (4, 'Latas', false), (5, 'Frascos', false), (6, 'Potes', false), (7, 'Caixas', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Cartuchos', false), (3, 'Caixas', false), (4, 'Pallet', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='chocolates-balas-e-guloseimas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Comida Balanceada =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('comida-balanceada', 'Comida Balanceada', 11) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Animais que são destinadas suas Rações?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'PetFood', false), (2, 'Peixes', false), (3, 'Equina', false), (4, 'Aves', false), (5, 'Suina', false), (6, 'Bovina', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Que tipos de Rações trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pré-Mix', false), (2, 'Pó', false), (3, 'Peletizada', false), (4, 'Extrusada', false), (5, 'Farelada', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Trabalham com Petiscos e Complementos para PetFood?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa realiza processo completo de Produção da Ração?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Depois de Fabricar a Ração, que tipo de embalagem primária utiliza no processo de embalagem, Sacos, Pacotes, Fardos, Caixas, Cartunhos, Potes?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sacos', false), (2, 'Descreva:', true), (3, 'Big Bag', false), (4, 'Quantos kg?', false), (5, 'Pacotes Almofada Pré-formados', false), (6, 'Pacotes Quadrado', false), (7, 'Pounch / Doypack', false), (8, 'Catedral (5 soldas, 7 soldas)', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois de Fabricar a Ração, que tipo de embalagem primária utiliza no processo de embalagem, Sacos, Pacotes, Fardos, Caixas, Cartunhos, Potes?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sacos', false), (2, 'Descreva:', true), (3, 'Big Bag', false), (4, 'Quantos kg?', false), (5, 'Caminhão', false), (6, 'Fardos', false), (7, 'Caixas', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'A Linha de Ração tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Os processos de Embalagem Primária e Secundária são Automáticos, Semi Automáticos ou Manuais?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Processo é automatico', false), (2, 'Processo é manual', false), (3, 'Processo é semi-automatico', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Os processos de Paletização atual são Automáticos ou Manuais?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Processo é automatico', false), (2, 'Processo é manual', false), (3, 'Processo é semi-automatico', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 15, 15, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='comida-balanceada')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 16, 16, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Condimentos e Especiarias =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('condimentos-e-especiarias', 'Condimentos e Especiarias', 12) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipo de grãos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Tempero seco', false), (2, 'Especiarias', false), (3, 'Outros', false), (4, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa fabrica Produto com Misturas Agregadas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente Empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Sachet', false), (3, 'Pounch', false), (4, 'Frascos', false), (5, 'Potes', false), (6, 'Caixas', false), (7, 'Big Bag', false), (8, 'Sacos', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Big Bag', false), (4, 'Sacos', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='condimentos-e-especiarias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Conservas =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('conservas', 'Conservas', 13) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Conservas', false), (2, 'Compotas', false), (3, 'Preparos em Conservas', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sachet', false), (2, 'Pacotes', false), (3, 'Pounch', false), (4, 'Sacos', false), (5, 'Big Bag', false), (6, 'Caixas', false), (7, 'Potes', false), (8, 'Frascos', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 7, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 8, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 9, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='conservas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 10, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Domosaniantes, Detergentes e Limpeza =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('domosaniantes-detergentes-e-limpeza', 'Domosaniantes, Detergentes e Limpeza', 14) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa produz?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Detergente', false), (2, 'Repelentes', false), (3, 'Vernizes', false), (4, 'Desinfetantes', false), (5, 'Saponáceos', false), (6, 'Desengordurantes', false), (7, 'Produtos de Tratamento de Água para Piscina', false), (8, 'Lustra Móveis', false), (9, 'Polidores', false), (10, 'Sabões', false), (11, 'Amaciantes', false), (12, 'Ceras', false), (13, 'Limpa Vidros', false), (14, 'Alvejantes', false), (15, 'Outros', false), (16, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo Sacos, Frascos, Potes, Caixas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Frascos', false), (2, 'Potes', false), (3, 'Caixas', false), (4, 'Latas', false), (5, 'Cartuchos', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo Fardos, Caixas, Cartuchos, Pallet?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Cartuchos', false), (3, 'Caixas', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Qual o material das máquinas utilizadas no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Aço Carbono', false), (2, 'Aço Inox 304', false), (3, 'Aço Inox 316', false), (4, 'PU', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'textarea', 'Alguma instrução especial referente a ambiente clorado?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='domosaniantes-detergentes-e-limpeza')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Ervas chás =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('ervas-chas', 'Ervas chás', 15) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Ervas Mate', false), (2, 'Ervas', false), (3, 'Chas', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa tem o processo de Secagem e Preparo da Erva?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, Recebemos tudo pronto e só embalamos e revendemos', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa tem o processo de Picador e Moinho de Erva?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, Recebemos tudo pronto e só embalamos e revendemos', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Tem algum processo de Inspeção de qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de peso', false), (2, 'Detecção de metais', false), (3, 'Raio-X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pacotes Pré-formados News', false), (3, 'Sachet', false), (4, 'Pounch / Doypack', false), (5, 'Frascos', false), (6, 'Potes', false), (7, 'Caixas', false), (8, 'big bag', false), (9, 'Sacos', false), (10, 'Frascos', false), (11, 'Cartuchos', false), (12, 'Outros', false), (13, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Pacotes utilizam Vácuo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Big bag', false), (4, 'Sacos', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ervas-chas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Farma, cosmeticos e nutraceuticos =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('farma-cosmeticos-e-nutraceuticos', 'Farma, cosmeticos e nutraceuticos', 16) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa produz?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Farma', false), (2, 'Suplementos', false), (3, 'Vitaminas', false), (4, 'Cosméticos', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo produtivo ou de embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo, Sachet, Pacotes, Frascos, Potes, Latas, Caixas, Cartuchos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Cartuchos', false), (3, 'Frascos', false), (4, 'Caixas', false), (5, 'Potes', false), (6, 'Frascos', false), (7, 'Pounch', false), (8, 'Sachet', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Existe inserção de bula nas embalagens?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, Manual', false), (2, 'Sim, Automática na encartuchadora/embaladora', false), (3, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo Fardos, Caixas, Cartuchos, Pallet?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Pallet', false), (3, 'Caixas', false), (4, 'Cartuchos', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 8, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 9, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='farma-cosmeticos-e-nutraceuticos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 10, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Feijão e Legumes =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('feijao-e-legumes', 'Feijão e Legumes', 17) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Feijão', false), (2, 'Lentilhas', false), (3, 'Ervilha', false), (4, 'Milho', false), (5, 'Grão de Bico', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa Realiza Limpeza ou Beneficia os grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, Processo completo', false), (2, 'Não, somente Empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa Realiza Polimento dos grãos? ( ) Sim' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente Empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Executa processo de seleção de grãos (esteiras vibratórias com peneiras)?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Sua empresa Realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Sua empresa Realiza algum processo de extração de Óleo ou Farinha?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pounch / Doypack', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='feijao-e-legumes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 17, 15, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Fertilizantes e adubo =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('fertilizantes-e-adubo', 'Fertilizantes e adubo', 18) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fertilizante granulares', false), (2, 'Fertilizante Líquidos', false), (3, 'Adubos', false), (4, 'Linha garden', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de qualidade no processo para separação de produto por tamanho, padronização?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Tem algum processo de mistura de produtos para Receitas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da produção, que tipo de embalagem utiliza para despacho Sacos, Big Bag, Fardos, Caixas, Pallet?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Cartuchos', false), (3, 'Frascos', false), (4, 'Sacos', false), (5, 'big bag', false), (6, 'Caixas', false), (7, 'Potes', false), (8, 'Fardos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='fertilizantes-e-adubo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Frigorificos e embutidos =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('frigorificos-e-embutidos', 'Frigorificos e embutidos', 19) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Crustáceos', false), (2, 'Camaróes', false), (3, 'Suino', false), (4, 'Frango', false), (5, 'Bovino', false), (6, 'Ovino', false), (7, 'Embutidos', false), (8, 'Peixes', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Empresa realiza algum processo de Industrialização, Corte, etc.?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Denossa completa', false), (2, 'Recebe Produto pronto, somente embala', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'textarea', 'A Empresa realiza algum processo de sanitização dos produtos?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Empresa realiza algum processo de fabricação de embutidos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo transportadores ou produtivo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza Pacotes, Bandejas, Sacos, Caixas, Cartuchos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Bandejas', false), (3, 'Cartuchos', false), (4, 'Caixas', false), (5, 'Sacos', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'textarea', 'Como é feita a dosagem/pesagem de produto na embalagem primária?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Pallet', false), (4, 'Caixas', false), (5, 'Sacos', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Tem algum processo de Inspeção de qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de peso', false), (2, 'Detecção de metais', false), (3, 'Raio-X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Existe processo de Congelamento na sua empresa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Na embalagem primária, trabalham com Atmosfera controlada?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 15, 15, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 16, 16, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 17, 17, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frigorificos-e-embutidos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 18, 18, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Frutas e vegetais =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('frutas-e-vegetais', 'Frutas e vegetais', 20) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Frutas', false), (2, 'Descreva:', true), (3, 'Verduras', false), (4, 'Descreva:', true), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza Processo Completo de Produção?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade no processo para separação de produto por cor, tamanho, padronização?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Cor', false), (2, 'tamanho', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'textarea', 'Quais produtos sua empresa oferece ao mercado?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Existe processo de Congelamento na sua empresa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'textarea', 'Existe processo de sanitização dos produtos? Como é?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'textarea', 'A empresa processa polpas? Como embala?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'A empresa processa sucos? Como embala?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Depois do processo interno, que tipo de embalagem primária utiliza no processo, Sacos, Pacotes, Fardos, Caixas, Cartuchos, Potes?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Em sacos de kg', false), (2, 'Descreva:', true), (3, 'Em Big Bag', false), (4, 'Quantos kg?', false), (5, 'Pacotes Almofada', false), (6, 'Pacotes Quadrado', false), (7, 'Pounch / Doypack', false), (8, 'Galões', false), (9, 'Garrafas Vidro', false), (10, 'Garrafas PET', false), (11, 'Caixas com Liner (Bolsa plástica)', false), (12, 'Bandeijas', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Na embalagem primária, trabalham com Atmosfera controlada?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo, Sacos, Fardos, Caixas, Cartuchos, Pallet, etc.?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Em sacos de kg', false), (2, 'Descreva:', true), (3, 'Em Big Bag', false), (4, 'Quantos kg?', false), (5, 'Caminhão', false), (6, 'Fardos', false), (7, 'Caixas', false), (8, 'outros', false), (9, 'Descreva', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Os processos de Embalagem Primária e Secundária são Automáticos, Semi Automáticos ou Manuais?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Processo é automatico', false), (2, 'Processo é manual', false), (3, 'Processo é semi-automatico', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 15, 15, 'multi_choice', 'Os processos de Paletização atual são Automáticos ou Manuais?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Processo é automatico', false), (2, 'Processo é manual', false), (3, 'Processo é semi-automatico', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 16, 16, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 17, 17, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 18, 18, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 19, 19, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='frutas-e-vegetais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 20, 20, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Gelatinas e Sobremesas =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('gelatinas-e-sobremesas', 'Gelatinas e Sobremesas', 21) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sobremesa', false), (2, 'Gelatinas', false), (3, 'Tem algum processo de Inspeção de qualidade no processo para separação de produto por cor, tamanho, padronização?', false), (4, 'Cor', false), (5, 'Manual', false), (6, 'Utiliza selecionadora automática por cor', false), (7, 'Tamanho', false), (8, 'Manual', false), (9, 'Utiliza selecionadora Mecânica por tamanho', false), (10, 'Flan', false), (11, 'Outros', false), (12, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sachet', false), (2, 'Potes', false), (3, 'Latas', false), (4, 'Pacotes', false), (5, 'Fardos', false), (6, 'Cartuchos', false), (7, 'Caixas', false), (8, 'Outros', false), (9, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Cartuchos', false), (3, 'Caixas', false), (4, 'Pallet', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='gelatinas-e-sobremesas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Ind Lacteos =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('ind-lacteos', 'Ind Lacteos', 22) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Bebida Láctea', false), (2, 'Iogurte', false), (3, 'Queijos', false), (4, 'Queijos Fundidos', false), (5, 'Creme Queijo', false), (6, 'Queijo em Pó', false), (7, 'Leite Caixa', false), (8, 'Leite Líquido', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo transportadores, ou produtivo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Qual?', false), (3, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo transportadores, ou produtivo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Qual?', false), (3, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Bandejas Termoformadas', false), (3, 'Sacos', false), (4, 'Caixas', false), (5, 'Potes', false), (6, 'Frascos', false), (7, 'Cartuchos', false), (8, 'Outros', false), (9, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Caixas', false), (5, 'Pallets', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Na embalagem primária, trabalham com Atmosfera controlada?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Quais produtos?', false), (3, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='ind-lacteos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Lodo e Subprodutos Industriais =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('lodo-e-subprodutos-industriais', 'Lodo e Subprodutos Industriais', 23) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Lodo', false), (2, 'Farinha Peixe', false), (3, 'Farinha Sangue', false), (4, 'Farinha Pena', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Empresa realiza algum processo de Industrialização / Transformação de Subprodutos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Recebimento, Digestores, Secagem', false), (2, 'Empresa realiza algum processo de Industrialização / Transformação depois do produto seco?', false), (3, 'Não realiza', false), (4, 'Moinho / Picadores', false), (5, 'Descreva', true), (6, 'Recebe Produto Pronto', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Qual?', false), (3, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da produção, que tipo de embalagem utiliza para despacho?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Sacos', false), (3, 'Big Bag', false), (4, 'Caixas', false), (5, 'Potes', false), (6, 'Bombonas', false), (7, 'Tambores', false), (8, 'Pacotes', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='lodo-e-subprodutos-industriais')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Marmeladas e Geleias =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('marmeladas-e-geleias', 'Marmeladas e Geleias', 24) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Marmeladas', false), (2, 'Doces', false), (3, 'Geleias', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'SACHET', false), (2, 'Pacotes', false), (3, 'Pounch', false), (4, 'Sacos', false), (5, 'Big Bag', false), (6, 'Caixas', false), (7, 'Potes', false), (8, 'Frascos', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='marmeladas-e-geleias')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Massa =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('massa', 'Massa', 25) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de MASSA trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fresca', false), (2, 'Que produto fabrica/ produz?', false), (3, 'Seca', false), (4, 'Que produto fabrica/ produz?', false), (5, 'Instantânea', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pounch', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'textarea', 'A Linha de produção, etc., tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='massa')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Milho =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('milho', 'Milho', 26) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Milho', false), (2, 'Farinha de Milho', false), (3, 'Milho Partido', false), (4, 'Germen', false), (5, 'Milho Pipoca', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa Realiza Limpeza ou Beneficia MILHO?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, Processo completo', false), (2, 'Não, somente Empacota e revende', false), (3, 'Outros', false), (4, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa Realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa Realiza Degerminação dos grãos (Moinho)?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Sua empresa Realiza Industrialização para ração grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Sua empresa Realiza algum processo de extração de Óleo ou Farinha?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa trabalha com produtos industrializados de Milho?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Não', false), (2, 'Sim, compramos prontos e envasamos', false), (3, 'Sim, compramos prontos e embalado, somente distribuímos', false), (4, 'Sim, temos processo de pré-cozimento para farinha e milho', false), (5, 'Sim, temos processo de Degerminação e Moinho', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pounch', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'textarea', 'A Linha de Limpeza, Secagem, Armazenamento e Beneficiamento, Torrefação, Moagem, Transporte, etc., tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 15, 15, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 16, 16, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='milho')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 17, 17, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Minerais e Ind Construção =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('minerais-e-ind-construcao', 'Minerais e Ind Construção', 27) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Barita', false), (2, 'Cálcio', false), (3, 'Cal', false), (4, 'Gesso', false), (5, 'Argamassa', false), (6, 'Cimento Cinza', false), (7, 'Cimento Branco', false), (8, 'Aditivos', false), (9, 'Rejuntes', false), (10, 'Bentonita', false), (11, 'Outros', false), (12, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Qual?', false), (3, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois da produção, que tipo de embalagem utiliza para despacho?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Sacos Boca Aberta', false), (3, 'Sacos Valvulados', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Pacotes', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='minerais-e-ind-construcao')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Molhos e Cremes =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('molhos-e-cremes', 'Molhos e Cremes', 28) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Molhos Soja', false), (2, 'Molho inglês', false), (3, 'Ketchup', false), (4, 'Maionese', false), (5, 'BBQ', false), (6, 'Cremes', false), (7, 'Temperos Líquidos', false), (8, 'Outros', false), (9, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa Realiza Produto com Misturas Agregadas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pounch', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='molhos-e-cremes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Panificação e Confeitaria =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('panificacao-e-confeitaria', 'Panificação e Confeitaria', 29) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Panificação', false), (2, 'Pão', false), (3, 'Pão de Queijo', false), (4, 'Pão de Hamburguer', false), (5, 'Bolos', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza a fabricação e formação dos pães?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, processo completo', false), (2, 'Não, somente empacota e revende ou recebe e revende', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa realiza processo de pré-assados dos pães?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Existe processo de Congelamento na sua empresa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Utiliza Anti-mofo no processo de embalagem dos produtos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Flowpack', false), (2, 'Flowpack com Fitilho', false), (3, 'Pacotes', false), (4, 'Pounch', false), (5, 'Sacos', false), (6, 'Big Bag', false), (7, 'Caixas', false), (8, 'Potes', false), (9, 'Frascos', false), (10, 'Cartuchos', false), (11, 'Outros', false), (12, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='panificacao-e-confeitaria')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Plastico, Polimeros e Reciclaveis =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('plastico-polimeros-e-reciclaveis', 'Plastico, Polimeros e Reciclaveis', 30) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa produz?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Plástico', false), (2, 'Polímeros', false), (3, 'Recicláveis', false), (4, 'Outros', false), (5, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de qualidade no processo para separação de produto por cor, tamanho, padronização?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Cor', false), (2, 'Manual', false), (3, 'Utiliza selecionadora automática por cor?', false), (4, 'Descreva:', true), (5, 'Tamanho', false), (6, 'Manual', false), (7, 'Utiliza selecionadora mecânica por tamanho?', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Sacos', false), (3, 'Big Bag', false), (4, 'Caixas', false), (5, 'Pallet', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='plastico-polimeros-e-reciclaveis')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Quimicos, Aditivos e Defensivos =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('quimicos-aditivos-e-defensivos', 'Quimicos, Aditivos e Defensivos', 31) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Químicos', false), (2, 'Aditivos', false), (3, 'Venenos', false), (4, 'Pesticidas', false), (5, 'Raticidas', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Sacos', false), (3, 'Potes', false), (4, 'Frascos', false), (5, 'Cartuchos', false), (6, 'Caixas', false), (7, 'Caixas com Saco Plástico Interno', false), (8, 'Latas', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Cartuchos', false), (3, 'Caixas', false), (4, 'Pallet', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 7, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 8, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quimicos-aditivos-e-defensivos')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 9, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
-- ===== Quinoa, Chia, Sesamo e Amaranto =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('quinoa-chia-sesamo-e-amaranto', 'Quinoa, Chia, Sesamo e Amaranto', 32) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Quinoa', false), (2, 'Chia', false), (3, 'Sésamo', false), (4, 'Amaranto', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza Limpeza, Seleção Ótica ou Beneficia os Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa trabalhacom Grão Tratado? Ou somente sem tratamento?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, grão tratado', false), (2, 'Não, somente grão sem tratamento', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'textarea', 'Sua empresa possui linha de Processo completo, ou tem interesse em melhorar algum processo em específico?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Sua empresa Realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Sua empresa Realiza algum processo de extração de Óleo ou Farinha?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pounch', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Potes', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'textarea', 'A Linha de Limpeza, Secagem, Armazenamento e Beneficiamento tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 15, 15, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='quinoa-chia-sesamo-e-amaranto')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 16, 16, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Sal =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('sal', 'Sal', 33) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produto sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sal', false), (2, 'Sal Rosa', false), (3, 'Sal Grosso', false), (4, 'Sal Iodado', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza Limpeza ou Beneficia os Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa realiza Padronização dos Grãos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa realiza Produto com Misturas Agregadas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sachet', false), (2, 'Pacotes', false), (3, 'Pounch', false), (4, 'Sacos', false), (5, 'Big Bag', false), (6, 'Caixas', false), (7, 'Potes', false), (8, 'Frascos', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'No processo atual qual o material utilizado nas máquinas (Carbono, Inox 304, Inox 316, PU, Outro?)' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Carbono', false), (2, 'Inox 304', false), (3, 'Inox 316', false), (4, 'PU', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sal')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Semente =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('semente', 'Semente', 34) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Soja', false), (2, 'Milho', false), (3, 'Pastagem', false), (4, 'Arroz', false), (5, 'Trigo', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa somente realiza Limpeza, Secagem e Armazenamento da Semente ou Beneficia a Semente?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, somente realiza limpeza e secagem', false), (2, 'Não, ela realiza limpeza, secagem, armazenamento e beneficia a semente', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Tem algum processo de Inspeção de qualidade no processo para separação de produto por cor, tamanho, padronização?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Cor', false), (2, 'Manual', false), (3, 'Utiliza selecionadora automática por cor', false), (4, 'Tamanho', false), (5, 'Manual', false), (6, 'Utiliza selecionadora mecânica por cor', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Quando vende Semente, vende pacotes ou big bag por Peso ou por Unidades dentro do Saco?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Peso', false), (2, 'Seria interessante ou já pesaram em um sistema ultra preciso com ensaque por unidades?', false), (3, 'Sim', false), (4, 'Não precisamos / Não se aplica', false), (5, 'Unidades', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'textarea', 'Sua empresa possui linha de Processo completo, ou tem interesse em melhorar algum processo em específico?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'A Linha de Limpeza, Secagem, Armazenamento e Beneficiamento tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='semente')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Snack =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('snack', 'Snack', 35) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produto sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Snack Fritos', false), (2, 'Snack Assado', false), (3, 'Snack Extrusado', false), (4, 'Batata Frita', false), (5, 'Batata Palha', false), (6, 'Pipoca', false), (7, 'Snack Expandido', false), (8, 'Fritado Pellet', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa Industrializa o próprio produto?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sachet', false), (2, 'Pacotes', false), (3, 'Pounch', false), (4, 'Sacos', false), (5, 'Big Bag', false), (6, 'Caixas', false), (7, 'Potes', false), (8, 'Frascos', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='snack')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Sorvetes =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('sorvetes', 'Sorvetes', 36) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sorvete', false), (2, 'Picole', false), (3, 'Outros', false), (4, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do Processo Produtivo ou de Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo, Frascos, Potes, Latas, Pacotes, Fardos, Caixas, Cartuchos, etc.?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Potes', false), (3, 'Latas', false), (4, 'Frascos', false), (5, 'Fardos', false), (6, 'Cartuchos', false), (7, 'Caixas', false), (8, 'Outros', false), (9, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo Fardos, Caixas, Cartuchos, Pallet?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Pallet', false), (3, 'Caixas', false), (4, 'Cartuchos', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sorvetes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Sucos e polpas =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('sucos-e-polpas', 'Sucos e polpas', 37) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Suco em Pó', false), (2, 'Polpa', false), (3, 'Outros', false), (4, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo produtivo ou de embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo, Sachet, Pacotes, Frascos, Potes, Latas, Caixas, Cartuchos?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Sachet', false), (3, 'Latas', false), (4, 'Frascos', false), (5, 'Potes', false), (6, 'Caixas', false), (7, 'Frascos', false), (8, 'Cartuchos', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 5, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false), (8, 'Sim', false), (9, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 6, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Pallet', false), (3, 'Caixas', false), (4, 'Cartuchos', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='sucos-e-polpas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Tabaco =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('tabaco', 'Tabaco', 38) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Somente Folha', false), (2, 'Cigarro', false), (3, 'Folhas com Essência', false), (4, 'Líquidos (Vape, Narquilé)', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa Realiza Limpeza, Seleção ou Beneficia o Tabaco?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, somente empacota e vende.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa trabalha com Tabaco para Narguilé com Essências, etc.?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Qual Volume/Produção?', false), (3, 'Sua empresa Tem Misturadores para Tabacos e Essência ou compra isso pronto de uma terceira?', false), (4, 'Sim', false), (5, 'Quantos e de Quantos litros cada?', false), (6, 'Não, compramos pronto', false), (7, 'De quem compra?', false), (8, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Sua empresa Trabalha com Essência Liquida para Narguilé/Cigarro Eletrônico?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não, compramos pronto', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Depois do processo interno, que tipo de embalagem primária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Em sacos de xxxkg', false), (2, 'Descreva:', true), (3, 'Pacotes Almofada', false), (4, 'Pounch', false), (5, 'Fardos', false), (6, 'Caixas', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Em sacos de xxxkg', false), (2, 'Descreva:', true), (3, 'Fardos', false), (4, 'Cartuchos', false), (5, 'Caixas', false), (6, 'Pallet', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tabaco')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Tintas, Pinturas, Resinas, Pigmentos e Vernizes =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('tintas-pinturas-resinas-pigmentos-e-vernizes', 'Tintas, Pinturas, Resinas, Pigmentos e Vernizes', 39) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de produtos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Tintas líquidas', false), (2, 'Tinatas em Pó', false), (3, 'Tinturas', false), (4, 'Resinas', false), (5, 'Pigmentos', false), (6, 'Vernizes', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo Sacos, Frascos, Potes, Caixas?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sacos', false), (2, 'Frascos', false), (3, 'Potes', false), (4, 'Caixas', false), (5, 'Galões', false), (6, 'Bombonas', false), (7, 'Tambores', false), (8, 'Doypack', false), (9, 'Outros', false), (10, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo Fardos, Caixas, Cartuchos, Pallet, etc.?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Caixas', false), (3, 'Cartuchos', false), (4, 'Pallets', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='tintas-pinturas-resinas-pigmentos-e-vernizes')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Trigo =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('trigo', 'Trigo', 40) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Grãos trabalham?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Trigo', false), (2, 'Farinha de Trigo', false), (3, 'Outros', false), (4, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'multi_choice', 'Sua empresa realiza limpeza ou beneficia Trigo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, Processo completo', false), (2, 'Não, somente empacota e revende ou recebe e processa', false), (3, 'Outros', false), (4, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Sua empresa Realiza Seleção Ótica por Cor?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Sua empresa trabalha com produtos industrializados de Trigo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Não', false), (2, 'Sim, compramos prontos e envasamos', false), (3, 'Sim, compramos prontos e embalado, somente distribuímos', false), (4, 'Sim, temos processo de Moinho Completo', false), (5, 'Sim, temos linha de bolachas', false), (6, 'Sim, temos linha de massas', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Tem algum processo de Inspeção de Qualidade?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Controle de Peso', false), (2, 'Detecção de Metais', false), (3, 'Raio X', false), (4, 'Inspeção de Produção por Balança da Fluxo', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Depois da industrialização, que tipo de embalagem utiliza como pacote primário?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Pacotes', false), (2, 'Pacote Pré-formado News', false), (3, 'Pounch', false), (4, 'Sacos', false), (5, 'Big Bag', false), (6, 'Caixas', false), (7, 'Potes', false), (8, 'Frascos', false), (9, 'Cartuchos', false), (10, 'Outros', false), (11, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem utiliza para transporte?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Bandejas', false), (3, 'Sacos', false), (4, 'Big Bag', false), (5, 'Caixas', false), (6, 'Pallets', false), (7, 'Outros', false), (8, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 10, 10, 'textarea', 'A Linha de Limpeza, Secagem, Armazenamento e Beneficiamento, Torrefação, Moagem, Transporte, etc., tem algum tipo de automação por computador ou depende de funcionários?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 11, 11, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 12, 12, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 13, 13, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='trigo')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 14, 14, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;
-- ===== Vinho, Destilados, Cervejas e Bebidas =====
INSERT INTO public.entrevista_segmentos (slug,nome_pt,ordem) VALUES ('vinho-destilados-cervejas-e-bebidas', 'Vinho, Destilados, Cervejas e Bebidas', 41) ON CONFLICT (slug) DO UPDATE SET nome_pt=EXCLUDED.nome_pt, ordem=EXCLUDED.ordem;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 1, 1, 'multi_choice', 'Que tipos de Produtos sua empresa fabrica?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Vinhos', false), (2, 'Espumantes', false), (3, 'Frisantes', false), (4, 'Vodka', false), (5, 'Aguardente / Cachaça', false), (6, 'Destilados', false), (7, 'Wisky', false), (8, 'Cerveja', false), (9, 'Licores', false), (10, 'Bebidas', false), (11, 'Bebidas Carbonatadas', false), (12, 'Outros', false), (13, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 2, 2, 'textarea', 'Qual volume tem de produção?' FROM seg RETURNING id)
SELECT 1 FROM p;
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 3, 3, 'multi_choice', 'Existe algum projeto em análise ou estudo para melhora do processo Produtivo ou Embalagem?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 4, 4, 'multi_choice', 'Depois do processo fabricação, que tipo de embalagem primária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Garrafas', false), (2, 'Frascos', false), (3, 'Barril', false), (4, 'Latas', false), (5, 'Outros', false), (6, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 5, 5, 'multi_choice', 'Depois da embalagem primária, que tipo de embalagem secundária utiliza no processo?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Fardos', false), (2, 'Fardo Termo Encolhível', false), (3, 'Cartuchos', false), (4, 'Caixas', false), (5, 'Pallet', false), (6, 'Outros', false), (7, 'Descreva:', true)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 6, 6, 'multi_choice', 'Você consegue descrever todo o fluxo do seu processo atualmente? E qual seria o cenário perfeito?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim, vou descrever o fluxo atualmente', false), (2, 'Descreva o fluxo atual:', true), (3, 'Sim, vou descrever o fluxo perfeito', false), (4, 'Descreva o fluxo perfeito:', true), (5, 'Sim, já possuo o fluxo.', false), (6, 'Não, preciso que me ajude a elaborar o fluxo atual', false), (7, 'Não, preciso que me ajude a elaborar o fluxo que preciso.', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 7, 7, 'multi_choice', 'Sua empresa Exporta ou Importa?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Sim', false), (2, 'Não', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 8, 8, 'multi_choice', 'Em sua empresa quem cuida da aquisição de máquinas para melhora do processo produtivo? Quem é a pessoa que toma decisões?' FROM seg RETURNING id)
INSERT INTO public.entrevista_opcoes (pergunta_id, ordem, label_pt, tem_descricao) SELECT p.id, v.ordem, v.label, v.tem_desc FROM p, (VALUES (1, 'Gerente de Produção', false), (2, 'Nome do Responsável:', true), (3, 'E-mail:', true), (4, 'Whatsapp', false), (5, 'Gerente de Manutencao', false), (6, 'Nome do Responsável:', true), (7, 'E-mail:', true), (8, 'Whatsapp', false), (9, 'Proprietario', false), (10, 'Nome do Responsável:', true), (11, 'E-mail:', true), (12, 'Whatsapp', false), (13, 'Compras', false), (14, 'Nome do Responsável:', true), (15, 'E-mail:', true), (16, 'Whatsapp', false)) AS v(ordem, label, tem_desc);
WITH seg AS (SELECT id FROM public.entrevista_segmentos WHERE slug='vinho-destilados-cervejas-e-bebidas')
, p AS (INSERT INTO public.entrevista_perguntas (segmento_id, numero, ordem, formato, enunciado_pt) SELECT id, 9, 9, 'textarea', 'Qual Faturamento aproximado de vossa empresa?' FROM seg RETURNING id)
SELECT 1 FROM p;