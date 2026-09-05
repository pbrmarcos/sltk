-- =============================================================
-- Base ausente do histórico de migrations: 17 tabelas (mais a função
-- gen_oc_numero() e a sequence ordens_compra_numero_seq) foram criadas
-- direto em produção via SQL Editor, nunca capturadas como migration —
-- domínios inteiros de Documentos, Ordens de Compra, anexos/atividades
-- de Insumos, SEO de páginas e links de compartilhamento de
-- relatório ficariam ausentes num ambiente novo (staging, disaster
-- recovery) que rodasse supabase/migrations/ do zero.
--
-- Reconstruído a partir de prod-schema-dump.sql (pg_dump --schema-only
-- real de produção, 2026-09-04) — não é reconstrução por inferência:
-- colunas, defaults, constraints, índices e policies abaixo são cópia
-- fiel do que já roda em produção. Idempotente — seguro rodar mesmo
-- se os objetos já existirem (produção incluída).
--
-- Nota sobre RLS de insumo_anexos/insumo_atividades/insumo_rfq_envios:
-- o dump de produção mostra policies antigas (nome com espaço) e novas
-- (nome com underscore, criadas por 20260820190000_rls_hardening_golive.sql)
-- coexistindo — aquela migration não conseguiu de fato substituir as
-- antigas (nomes não batiam) e acabou só somando policies novas por
-- cima. Aqui replicamos as policies ANTIGAS (as que já existiam antes
-- de 20260820190000) para não colidir com os "create policy" sem
-- "drop... if exists" correspondente dessa migration mais recente.
-- =============================================================

-- ---------- Enums ----------
do $$ begin
  create type public.documento_status as enum ('rascunho', 'emitido', 'arquivado', 'em_revisao', 'aprovado', 'publicado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.documento_idioma as enum ('pt', 'es', 'en');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.documento_moeda as enum ('USD', 'BRL', 'EUR', 'PYG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.documento_aprovacao_acao as enum ('submeter', 'aprovar', 'rejeitar', 'publicar', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.etp_historico_tipo as enum ('alteracao', 'nota', 'aprovacao', 'status', 'anexo', 'reabertura');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.insumo_rfq_canal as enum ('email', 'whatsapp', 'wechat', 'telefone', 'portal', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.insumo_rfq_status as enum ('enviado', 'respondido', 'nao_respondeu', 'descartado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.oc_status as enum ('rascunho', 'aguardando_aprovacao', 'aprovada', 'enviada', 'recebida_parcial', 'recebida', 'cancelada');
exception when duplicate_object then null; end $$;

-- ---------- documentos ----------
CREATE TABLE IF NOT EXISTS public.documentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  tipo_codigo text NOT NULL REFERENCES public.documento_tipos(codigo),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  titulo text,
  status public.documento_status DEFAULT 'rascunho'::public.documento_status NOT NULL,
  idioma_principal public.documento_idioma DEFAULT 'pt'::public.documento_idioma NOT NULL,
  moeda public.documento_moeda DEFAULT 'BRL'::public.documento_moeda NOT NULL,
  versao text DEFAULT '1.0.0'::text NOT NULL,
  responsavel_id uuid REFERENCES auth.users(id),
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  blocos jsonb DEFAULT '[]'::jsonb NOT NULL,
  idiomas_gerados public.documento_idioma[] DEFAULT '{}'::public.documento_idioma[] NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now() NOT NULL,
  drive_folder_id text,
  drive_file_ids jsonb,
  drive_url text,
  drive_synced_at timestamptz,
  drive_sync_error text
);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON public.documentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_oportunidade ON public.documentos (oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON public.documentos (tipo_codigo);

GRANT SELECT ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documentos_select ON public.documentos;
CREATE POLICY documentos_select ON public.documentos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR created_by = auth.uid() OR responsavel_id = auth.uid());

DROP POLICY IF EXISTS documentos_insert ON public.documentos;
CREATE POLICY documentos_insert ON public.documentos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.can_access_cliente(cliente_id));

DROP POLICY IF EXISTS documentos_update ON public.documentos;
CREATE POLICY documentos_update ON public.documentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR created_by = auth.uid());

DROP POLICY IF EXISTS documentos_delete ON public.documentos;
CREATE POLICY documentos_delete ON public.documentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- documento_versoes ----------
CREATE TABLE IF NOT EXISTS public.documento_versoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  versao text NOT NULL,
  arquivos jsonb DEFAULT '{}'::jsonb NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  gerado_por uuid REFERENCES auth.users(id),
  gerado_em timestamptz DEFAULT now() NOT NULL,
  UNIQUE (documento_id, versao)
);
CREATE INDEX IF NOT EXISTS idx_doc_versoes_documento ON public.documento_versoes (documento_id);

GRANT SELECT ON public.documento_versoes TO authenticated;
GRANT ALL ON public.documento_versoes TO service_role;
ALTER TABLE public.documento_versoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS versoes_select ON public.documento_versoes;
CREATE POLICY versoes_select ON public.documento_versoes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documentos d
    WHERE d.id = documento_versoes.documento_id
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR d.created_by = auth.uid() OR d.responsavel_id = auth.uid())
  ));

DROP POLICY IF EXISTS versoes_insert ON public.documento_versoes;
CREATE POLICY versoes_insert ON public.documento_versoes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documentos d
    WHERE d.id = documento_versoes.documento_id
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR d.created_by = auth.uid() OR d.responsavel_id = auth.uid())
  ));

-- ---------- documento_aprovacoes ----------
CREATE TABLE IF NOT EXISTS public.documento_aprovacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  versao text,
  acao public.documento_aprovacao_acao NOT NULL,
  status_anterior public.documento_status,
  status_novo public.documento_status NOT NULL,
  comentario text,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_nome text,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_doc_aprov_doc ON public.documento_aprovacoes (documento_id, created_at DESC);

GRANT SELECT ON public.documento_aprovacoes TO authenticated;
GRANT ALL ON public.documento_aprovacoes TO service_role;
ALTER TABLE public.documento_aprovacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doc_aprov_select ON public.documento_aprovacoes;
CREATE POLICY doc_aprov_select ON public.documento_aprovacoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS doc_aprov_insert ON public.documento_aprovacoes;
CREATE POLICY doc_aprov_insert ON public.documento_aprovacoes FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ---------- documento_assinaturas ----------
CREATE TABLE IF NOT EXISTS public.documento_assinaturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  versao text NOT NULL,
  idioma text NOT NULL CHECK (idioma = ANY (ARRAY['pt', 'es', 'en'])),
  storage_path text NOT NULL,
  sha256 text NOT NULL,
  hmac text NOT NULL,
  algoritmo text DEFAULT 'HMAC-SHA256'::text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_by_nome text,
  signed_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS documento_assinaturas_doc_idx ON public.documento_assinaturas (documento_id, versao, idioma);

GRANT SELECT ON public.documento_assinaturas TO authenticated;
GRANT ALL ON public.documento_assinaturas TO service_role;
ALTER TABLE public.documento_assinaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assinaturas_select_auth ON public.documento_assinaturas;
CREATE POLICY assinaturas_select_auth ON public.documento_assinaturas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS assinaturas_insert_auth ON public.documento_assinaturas;
CREATE POLICY assinaturas_insert_auth ON public.documento_assinaturas FOR INSERT TO authenticated
  WITH CHECK (signed_by = auth.uid());

-- ---------- documento_layout_config ----------
CREATE TABLE IF NOT EXISTS public.documento_layout_config (
  tipo_codigo text PRIMARY KEY REFERENCES public.documento_tipos(codigo) ON DELETE CASCADE,
  accent_color text DEFAULT '#0B3D91'::text NOT NULL,
  logo_url text,
  empresa_nome text DEFAULT 'Solutek Group'::text NOT NULL,
  empresa_endereco text,
  empresa_contato text,
  rodape_extra text,
  config_extra jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT ON public.documento_layout_config TO authenticated;
GRANT ALL ON public.documento_layout_config TO service_role;
ALTER TABLE public.documento_layout_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS layout_select ON public.documento_layout_config;
CREATE POLICY layout_select ON public.documento_layout_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS layout_admin_write ON public.documento_layout_config;
CREATE POLICY layout_admin_write ON public.documento_layout_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- entrevista_documentos_gerados ----------
CREATE TABLE IF NOT EXISTS public.entrevista_documentos_gerados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entrevista_id uuid NOT NULL REFERENCES public.entrevistas(id) ON DELETE CASCADE,
  idioma text DEFAULT 'pt'::text NOT NULL,
  file_name text,
  storage_path text,
  drive_file_id text,
  drive_view_url text,
  drive_folder_id text,
  drive_folder_url text,
  gerado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ent_docs_entrevista ON public.entrevista_documentos_gerados (entrevista_id);

GRANT SELECT ON public.entrevista_documentos_gerados TO authenticated;
GRANT ALL ON public.entrevista_documentos_gerados TO service_role;
ALTER TABLE public.entrevista_documentos_gerados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ent_docs_select ON public.entrevista_documentos_gerados;
CREATE POLICY ent_docs_select ON public.entrevista_documentos_gerados FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ent_docs_insert ON public.entrevista_documentos_gerados;
CREATE POLICY ent_docs_insert ON public.entrevista_documentos_gerados FOR INSERT TO authenticated WITH CHECK (true);

-- ---------- equipamento_etp_anexos ----------
CREATE TABLE IF NOT EXISTS public.equipamento_etp_anexos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  etp_id uuid NOT NULL REFERENCES public.equipamento_etps(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  drive_view_url text,
  drive_folder_id text,
  nome_final text NOT NULL,
  nome_original text NOT NULL,
  descricao text NOT NULL,
  mime_type text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  user_id uuid,
  user_nome text,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  deleted_by uuid
);
CREATE INDEX IF NOT EXISTS idx_etp_anexos_etp ON public.equipamento_etp_anexos (etp_id) WHERE deleted_at IS NULL;

GRANT SELECT ON public.equipamento_etp_anexos TO authenticated;
GRANT ALL ON public.equipamento_etp_anexos TO service_role;
ALTER TABLE public.equipamento_etp_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS etp_anexos_select ON public.equipamento_etp_anexos;
CREATE POLICY etp_anexos_select ON public.equipamento_etp_anexos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'production'));

DROP POLICY IF EXISTS etp_anexos_insert ON public.equipamento_etp_anexos;
CREATE POLICY etp_anexos_insert ON public.equipamento_etp_anexos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer'));

DROP POLICY IF EXISTS etp_anexos_update ON public.equipamento_etp_anexos;
CREATE POLICY etp_anexos_update ON public.equipamento_etp_anexos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer'));

-- ---------- equipamento_etp_historico ----------
CREATE TABLE IF NOT EXISTS public.equipamento_etp_historico (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  etp_id uuid NOT NULL REFERENCES public.equipamento_etps(id) ON DELETE CASCADE,
  tipo public.etp_historico_tipo NOT NULL,
  campo text,
  valor_anterior text,
  valor_novo text,
  mensagem text,
  created_by uuid,
  created_by_nome text,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS equipamento_etp_historico_etp_idx ON public.equipamento_etp_historico (etp_id, created_at DESC);

GRANT SELECT ON public.equipamento_etp_historico TO authenticated;
GRANT ALL ON public.equipamento_etp_historico TO service_role;
ALTER TABLE public.equipamento_etp_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe técnica lê histórico" ON public.equipamento_etp_historico;
CREATE POLICY "Equipe técnica lê histórico" ON public.equipamento_etp_historico FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer'));

DROP POLICY IF EXISTS "Equipe técnica registra histórico" ON public.equipamento_etp_historico;
CREATE POLICY "Equipe técnica registra histórico" ON public.equipamento_etp_historico FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer')));

-- ---------- insumo_anexos ----------
-- Nomes de policy com espaço são de propósito — são as que já existem
-- em produção antes de 20260820190000_rls_hardening_golive.sql (que
-- soma "insumo_anexos_rw" por cima, sem conseguir substituir estas).
CREATE TABLE IF NOT EXISTS public.insumo_anexos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id uuid NOT NULL REFERENCES public.projeto_insumos(id) ON DELETE CASCADE,
  kind text DEFAULT 'outro'::text NOT NULL CHECK (kind = ANY (ARRAY['orcamento', 'tecnico', 'outro'])),
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  drive_file_id text,
  drive_view_url text,
  drive_folder_id text,
  drive_folder_url text,
  file_name text NOT NULL,
  original_name text,
  mime_type text,
  size_bytes bigint,
  valor numeric(14,2),
  moeda text DEFAULT 'BRL'::text,
  condicao_pagamento text,
  lead_time_dias integer,
  incoterm text,
  validade_ate date,
  observacoes text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_nome text,
  criado_em timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_insumo_anexos_fornecedor ON public.insumo_anexos (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_insumo_anexos_insumo ON public.insumo_anexos (insumo_id);

GRANT SELECT ON public.insumo_anexos TO authenticated;
GRANT ALL ON public.insumo_anexos TO service_role;
ALTER TABLE public.insumo_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insumo_anexos read" ON public.insumo_anexos;
CREATE POLICY "insumo_anexos read" ON public.insumo_anexos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projeto_insumos pi
    WHERE pi.id = insumo_anexos.insumo_id
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'))
  ));

DROP POLICY IF EXISTS "insumo_anexos write" ON public.insumo_anexos;
CREATE POLICY "insumo_anexos write" ON public.insumo_anexos FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projeto_insumos pi
    WHERE pi.id = insumo_anexos.insumo_id
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'))
  ));

-- ---------- insumo_atividades ----------
CREATE TABLE IF NOT EXISTS public.insumo_atividades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id uuid NOT NULL REFERENCES public.projeto_insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text,
  meta jsonb,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_nome text,
  criado_em timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_insumo_atividades_insumo ON public.insumo_atividades (insumo_id, criado_em DESC);

GRANT SELECT ON public.insumo_atividades TO authenticated;
GRANT ALL ON public.insumo_atividades TO service_role;
ALTER TABLE public.insumo_atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insumo_atividades read" ON public.insumo_atividades;
CREATE POLICY "insumo_atividades read" ON public.insumo_atividades FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projeto_insumos pi
    WHERE pi.id = insumo_atividades.insumo_id
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'))
  ));

DROP POLICY IF EXISTS "insumo_atividades insert" ON public.insumo_atividades;
CREATE POLICY "insumo_atividades insert" ON public.insumo_atividades FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projeto_insumos pi
    WHERE pi.id = insumo_atividades.insumo_id
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'))
  ));

-- ---------- insumo_rfq_envios ----------
CREATE TABLE IF NOT EXISTS public.insumo_rfq_envios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id uuid NOT NULL REFERENCES public.projeto_insumos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  canal public.insumo_rfq_canal DEFAULT 'email'::public.insumo_rfq_canal NOT NULL,
  status public.insumo_rfq_status DEFAULT 'enviado'::public.insumo_rfq_status NOT NULL,
  data_envio timestamptz DEFAULT now() NOT NULL,
  data_resposta timestamptz,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_insumo_rfq_envios_fornecedor ON public.insumo_rfq_envios (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_insumo_rfq_envios_insumo ON public.insumo_rfq_envios (insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumo_rfq_envios_status ON public.insumo_rfq_envios (status);

GRANT SELECT ON public.insumo_rfq_envios TO authenticated;
GRANT ALL ON public.insumo_rfq_envios TO service_role;
ALTER TABLE public.insumo_rfq_envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insumo_rfq_envios read" ON public.insumo_rfq_envios;
CREATE POLICY "insumo_rfq_envios read" ON public.insumo_rfq_envios FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projeto_insumos pi
    WHERE pi.id = insumo_rfq_envios.insumo_id
      AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'))
  ));

DROP POLICY IF EXISTS "insumo_rfq_envios insert" ON public.insumo_rfq_envios;
CREATE POLICY "insumo_rfq_envios insert" ON public.insumo_rfq_envios FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'));

DROP POLICY IF EXISTS "insumo_rfq_envios update" ON public.insumo_rfq_envios;
CREATE POLICY "insumo_rfq_envios update" ON public.insumo_rfq_envios FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'engineer') OR public.has_role(auth.uid(), 'purchasing'));

DROP POLICY IF EXISTS "insumo_rfq_envios delete" ON public.insumo_rfq_envios;
CREATE POLICY "insumo_rfq_envios delete" ON public.insumo_rfq_envios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'purchasing'));

-- ---------- ordens_compra (+ gen_oc_numero) ----------
CREATE SEQUENCE IF NOT EXISTS public.ordens_compra_numero_seq
  START WITH 10000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE OR REPLACE FUNCTION public.gen_oc_numero() RETURNS text
  LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
  AS $$
    SELECT 'OC' || lpad(nextval('public.ordens_compra_numero_seq')::text, 6, '0');
  $$;

CREATE TABLE IF NOT EXISTS public.ordens_compra (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text DEFAULT public.gen_oc_numero() NOT NULL UNIQUE,
  cotacao_id uuid REFERENCES public.cotacoes(id) ON DELETE SET NULL,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  projeto_id uuid REFERENCES public.equipamento_projetos(id) ON DELETE SET NULL,
  status public.oc_status DEFAULT 'rascunho'::public.oc_status NOT NULL,
  tipo text DEFAULT 'normal'::text NOT NULL CHECK (tipo = ANY (ARRAY['normal', 'terceiros'])),
  moeda text DEFAULT 'BRL'::text NOT NULL,
  incoterm text,
  emissao_em date DEFAULT CURRENT_DATE NOT NULL,
  entrega_prevista date,
  enviado_em timestamptz,
  aprovado_em timestamptz,
  aprovado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  condicao_pagamento text,
  transportadora text,
  observacoes text,
  observacoes_internas text,
  comprador_razao_social text,
  comprador_cnpj text,
  comprador_ie text,
  comprador_endereco text,
  comprador_cidade text,
  comprador_uf text,
  comprador_cep text,
  comprador_telefone text,
  comprador_email text,
  comprador_logo_url text,
  fornecedor_codigo text,
  fornecedor_razao_social text,
  fornecedor_nome_fantasia text,
  fornecedor_cnpj text,
  fornecedor_ie text,
  fornecedor_endereco text,
  fornecedor_cidade text,
  fornecedor_uf text,
  fornecedor_cep text,
  fornecedor_pais text,
  fornecedor_telefone text,
  fornecedor_email text,
  fornecedor_contato text,
  valor_subtotal numeric(14,2) DEFAULT 0 NOT NULL,
  valor_desconto numeric(14,2) DEFAULT 0 NOT NULL,
  valor_ipi numeric(14,2) DEFAULT 0 NOT NULL,
  valor_icms_st numeric(14,2) DEFAULT 0 NOT NULL,
  valor_frete numeric(14,2) DEFAULT 0 NOT NULL,
  valor_total numeric(14,2) DEFAULT 0 NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  markup_pct numeric(6,3),
  valor_repasse numeric(14,2),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  cliente_final_razao_social text,
  cliente_final_cnpj text,
  oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  valor_repasse_total numeric(14,2) DEFAULT 0,
  margem_bruta numeric(14,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_oc_cotacao ON public.ordens_compra (cotacao_id);
CREATE INDEX IF NOT EXISTS idx_oc_emissao ON public.ordens_compra (emissao_em DESC);
CREATE INDEX IF NOT EXISTS idx_oc_fornecedor ON public.ordens_compra (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_oc_projeto ON public.ordens_compra (projeto_id);
CREATE INDEX IF NOT EXISTS idx_oc_status ON public.ordens_compra (status) WHERE deleted_at IS NULL;

GRANT SELECT ON public.ordens_compra TO authenticated;
GRANT ALL ON public.ordens_compra TO service_role;
ALTER TABLE public.ordens_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oc_select ON public.ordens_compra;
CREATE POLICY oc_select ON public.ordens_compra FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'purchasing') OR public.has_role(auth.uid(), 'engineer'));

DROP POLICY IF EXISTS oc_write ON public.ordens_compra;
CREATE POLICY oc_write ON public.ordens_compra FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'purchasing'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'purchasing'));

-- ---------- ordem_compra_itens ----------
CREATE TABLE IF NOT EXISTS public.ordem_compra_itens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_compra_id uuid NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.projeto_insumos(id) ON DELETE SET NULL,
  cotacao_item_id uuid REFERENCES public.cotacao_itens(id) ON DELETE SET NULL,
  proposta_item_id uuid REFERENCES public.cotacao_proposta_itens(id) ON DELETE SET NULL,
  ordem integer DEFAULT 1 NOT NULL,
  codigo_produto text,
  descricao text NOT NULL,
  unidade text DEFAULT 'UN'::text NOT NULL,
  quantidade numeric(14,4) DEFAULT 1 NOT NULL,
  saldo numeric(14,4),
  data_entrega date,
  valor_unitario numeric(14,6) DEFAULT 0 NOT NULL,
  valor_desconto numeric(14,2) DEFAULT 0 NOT NULL,
  valor_ipi numeric(14,2) DEFAULT 0 NOT NULL,
  valor_icms_st numeric(14,2) DEFAULT 0 NOT NULL,
  valor_total numeric(14,2) GENERATED ALWAYS AS (((quantidade * valor_unitario) - valor_desconto + valor_ipi + valor_icms_st)) STORED,
  codigo_compra text,
  observacoes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  markup_pct numeric(6,3),
  valor_repasse_unit numeric(14,6),
  valor_repasse_total_item numeric(14,2) GENERATED ALWAYS AS (
    round(COALESCE(valor_repasse_unit, valor_unitario * (1 + COALESCE(markup_pct, 0) / 100.0)) * quantidade, 2)
  ) STORED
);
CREATE INDEX IF NOT EXISTS idx_oc_itens_oc ON public.ordem_compra_itens (ordem_compra_id);

GRANT SELECT ON public.ordem_compra_itens TO authenticated;
GRANT ALL ON public.ordem_compra_itens TO service_role;
ALTER TABLE public.ordem_compra_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oc_itens_select ON public.ordem_compra_itens;
CREATE POLICY oc_itens_select ON public.ordem_compra_itens FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'purchasing') OR public.has_role(auth.uid(), 'engineer'))
    AND EXISTS (SELECT 1 FROM public.ordens_compra oc WHERE oc.id = ordem_compra_itens.ordem_compra_id)
  );

DROP POLICY IF EXISTS oc_itens_write ON public.ordem_compra_itens;
CREATE POLICY oc_itens_write ON public.ordem_compra_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'purchasing'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'purchasing'));

-- ---------- ordem_compra_historico ----------
CREATE TABLE IF NOT EXISTS public.ordem_compra_historico (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_compra_id uuid NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome text,
  acao text NOT NULL,
  status_anterior text,
  status_novo text,
  detalhes jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oc_hist ON public.ordem_compra_historico (ordem_compra_id, created_at DESC);

GRANT SELECT ON public.ordem_compra_historico TO authenticated;
GRANT ALL ON public.ordem_compra_historico TO service_role;
ALTER TABLE public.ordem_compra_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oc_hist_select ON public.ordem_compra_historico;
CREATE POLICY oc_hist_select ON public.ordem_compra_historico FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS oc_hist_insert ON public.ordem_compra_historico;
CREATE POLICY oc_hist_insert ON public.ordem_compra_historico FOR INSERT TO authenticated WITH CHECK (true);

-- ---------- page_seo ----------
CREATE TABLE IF NOT EXISTS public.page_seo (
  route_path text PRIMARY KEY,
  title text,
  description text,
  og_title text,
  og_description text,
  og_image text,
  canonical text,
  noindex boolean DEFAULT false NOT NULL,
  last_scanned_at timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT ON public.page_seo TO authenticated;
GRANT ALL ON public.page_seo TO service_role;
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read page_seo" ON public.page_seo;
CREATE POLICY "Admins read page_seo" ON public.page_seo FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage page_seo" ON public.page_seo;
CREATE POLICY "Admins manage page_seo" ON public.page_seo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- relatorio_share_links / relatorio_share_submissoes ----------
-- id sem default: gerado pela aplicação (jti do token assinado), não
-- por gen_random_uuid() — ver newJti()/createShareLink em
-- src/lib/share-token.server.ts e src/lib/share-links.functions.ts.
CREATE TABLE IF NOT EXISTS public.relatorio_share_links (
  id uuid PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['fat', 'sat'])),
  relatorio_id uuid NOT NULL,
  token_hash text NOT NULL,
  scope text[] DEFAULT ARRAY['checklist', 'assinatura', 'identificacao', 'medicoes']::text[] NOT NULL,
  rotulo text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  use_count integer DEFAULT 0 NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_share_links_relatorio ON public.relatorio_share_links (tipo, relatorio_id, created_at DESC);

GRANT SELECT ON public.relatorio_share_links TO authenticated;
GRANT ALL ON public.relatorio_share_links TO service_role;
ALTER TABLE public.relatorio_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS share_links_rw ON public.relatorio_share_links;
CREATE POLICY share_links_rw ON public.relatorio_share_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.relatorio_share_submissoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id uuid NOT NULL REFERENCES public.relatorio_share_links(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['fat', 'sat'])),
  relatorio_id uuid NOT NULL,
  acao text NOT NULL,
  alvo_id uuid,
  payload jsonb,
  signatario_nome text,
  signatario_cargo text,
  ip text,
  user_agent text,
  status text DEFAULT 'aplicada'::text NOT NULL CHECK (status = ANY (ARRAY['aplicada', 'rejeitada'])),
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_share_submissoes_link ON public.relatorio_share_submissoes (share_link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_submissoes_relatorio ON public.relatorio_share_submissoes (tipo, relatorio_id, created_at DESC);

GRANT SELECT ON public.relatorio_share_submissoes TO authenticated;
GRANT ALL ON public.relatorio_share_submissoes TO service_role;
ALTER TABLE public.relatorio_share_submissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS share_submissoes_r ON public.relatorio_share_submissoes;
CREATE POLICY share_submissoes_r ON public.relatorio_share_submissoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
    OR EXISTS (SELECT 1 FROM public.relatorio_share_links l WHERE l.id = relatorio_share_submissoes.share_link_id AND l.created_by = auth.uid())
  );
