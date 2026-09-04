-- Bloco 3.1 — Formulários RFQ públicos + liberação de cliente para sales.
-- Sales só vê clientes/RFQs quando o manager libera. Manager/admin veem tudo.

-- =====================================================================
-- 1. LIBERAÇÃO CLIENTE → SALES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.cliente_sales_liberacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  sales_id uuid NOT NULL,
  liberado_por uuid,
  liberado_em timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz,
  revogado_por uuid,
  observacoes text,
  UNIQUE (cliente_id, sales_id)
);

CREATE INDEX IF NOT EXISTS idx_csl_cliente ON public.cliente_sales_liberacao(cliente_id) WHERE revogado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_csl_sales   ON public.cliente_sales_liberacao(sales_id)   WHERE revogado_em IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.cliente_sales_liberacao TO authenticated;
GRANT ALL ON public.cliente_sales_liberacao TO service_role;

ALTER TABLE public.cliente_sales_liberacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csl_read" ON public.cliente_sales_liberacao;
CREATE POLICY "csl_read" ON public.cliente_sales_liberacao
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR sales_id = auth.uid()
  );

DROP POLICY IF EXISTS "csl_write" ON public.cliente_sales_liberacao;
CREATE POLICY "csl_write" ON public.cliente_sales_liberacao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Helper: admin/manager sempre; sales apenas quando liberado.
CREATE OR REPLACE FUNCTION public.pode_ver_cliente(_uid uuid, _cliente uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_uid, 'admin')
    OR public.has_role(_uid, 'manager')
    OR EXISTS (
      SELECT 1 FROM public.cliente_sales_liberacao csl
      WHERE csl.cliente_id = _cliente
        AND csl.sales_id = _uid
        AND csl.revogado_em IS NULL
    );
$$;

-- =====================================================================
-- 2. CATÁLOGO DE TIPOS DE FORMULÁRIO (MÁQUINA)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rfq_formulario_tipo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome_pt text NOT NULL,
  nome_es text,
  nome_en text,
  familia text,
  descricao text,
  campos_schema jsonb NOT NULL DEFAULT '{"secoes":[]}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rfq_formulario_tipo TO authenticated;
GRANT SELECT ON public.rfq_formulario_tipo TO anon;
GRANT ALL ON public.rfq_formulario_tipo TO service_role;

ALTER TABLE public.rfq_formulario_tipo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rft_read_all" ON public.rfq_formulario_tipo;
CREATE POLICY "rft_read_all" ON public.rfq_formulario_tipo
  FOR SELECT USING (ativo IS TRUE);

DROP POLICY IF EXISTS "rft_write_admin" ON public.rfq_formulario_tipo;
CREATE POLICY "rft_write_admin" ON public.rfq_formulario_tipo
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- 3. LINKS PÚBLICOS EMITIDOS PELO SALES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rfq_formulario_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id uuid NOT NULL REFERENCES public.rfq_formulario_tipo(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  sales_id uuid NOT NULL,
  idioma text NOT NULL CHECK (idioma IN ('pt','es','en')),
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','preenchido','expirado','arquivado')),
  titulo text,
  expira_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  preenchido_em timestamptz,
  submissao_id uuid,
  observacoes text
);

CREATE INDEX IF NOT EXISTS idx_rfl_cliente ON public.rfq_formulario_link(cliente_id);
CREATE INDEX IF NOT EXISTS idx_rfl_sales   ON public.rfq_formulario_link(sales_id);
CREATE INDEX IF NOT EXISTS idx_rfl_status  ON public.rfq_formulario_link(status);

GRANT SELECT, INSERT, UPDATE ON public.rfq_formulario_link TO authenticated;
GRANT SELECT, UPDATE ON public.rfq_formulario_link TO anon;
GRANT ALL ON public.rfq_formulario_link TO service_role;

ALTER TABLE public.rfq_formulario_link ENABLE ROW LEVEL SECURITY;

-- SELECT autenticado
DROP POLICY IF EXISTS "rfl_read_auth" ON public.rfq_formulario_link;
CREATE POLICY "rfl_read_auth" ON public.rfq_formulario_link
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR sales_id = auth.uid()
    OR public.pode_ver_cliente(auth.uid(), cliente_id)
  );

-- INSERT autenticado (sales só se cliente estiver liberado)
DROP POLICY IF EXISTS "rfl_ins_auth" ON public.rfq_formulario_link;
CREATE POLICY "rfl_ins_auth" ON public.rfq_formulario_link
  FOR INSERT TO authenticated
  WITH CHECK (
    sales_id = auth.uid()
    AND public.pode_ver_cliente(auth.uid(), cliente_id)
  );

-- UPDATE autenticado (dono do link, manager ou admin)
DROP POLICY IF EXISTS "rfl_upd_auth" ON public.rfq_formulario_link;
CREATE POLICY "rfl_upd_auth" ON public.rfq_formulario_link
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR sales_id = auth.uid()
  );

-- SELECT anônimo — restrito a links abertos (renderizador público lê pelo slug).
DROP POLICY IF EXISTS "rfl_read_anon" ON public.rfq_formulario_link;
CREATE POLICY "rfl_read_anon" ON public.rfq_formulario_link
  FOR SELECT TO anon
  USING (status = 'aberto' AND (expira_em IS NULL OR expira_em > now()));

-- UPDATE anônimo — o endpoint público de submit atualiza status/preenchido_em/submissao_id.
DROP POLICY IF EXISTS "rfl_upd_anon" ON public.rfq_formulario_link;
CREATE POLICY "rfl_upd_anon" ON public.rfq_formulario_link
  FOR UPDATE TO anon
  USING (status = 'aberto' AND (expira_em IS NULL OR expira_em > now()))
  WITH CHECK (status IN ('aberto','preenchido'));

-- =====================================================================
-- 4. SUBMISSÕES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rfq_submissao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.rfq_formulario_link(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_id uuid NOT NULL REFERENCES public.rfq_formulario_tipo(id),
  idioma text NOT NULL,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  preenchido_por_nome text,
  preenchido_por_email text,
  preenchido_por_telefone text,
  ip inet,
  user_agent text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  lida_em timestamptz,
  lida_por uuid,
  oportunidade_id uuid,
  processo_id uuid,
  observacoes_internas text
);

CREATE INDEX IF NOT EXISTS idx_rfs_cliente ON public.rfq_submissao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_rfs_link    ON public.rfq_submissao(link_id);
CREATE INDEX IF NOT EXISTS idx_rfs_criado  ON public.rfq_submissao(criado_em DESC);

GRANT SELECT, INSERT, UPDATE ON public.rfq_submissao TO authenticated;
GRANT INSERT ON public.rfq_submissao TO anon;
GRANT ALL ON public.rfq_submissao TO service_role;

ALTER TABLE public.rfq_submissao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfs_read_auth" ON public.rfq_submissao;
CREATE POLICY "rfs_read_auth" ON public.rfq_submissao
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.pode_ver_cliente(auth.uid(), cliente_id)
  );

DROP POLICY IF EXISTS "rfs_upd_auth" ON public.rfq_submissao;
CREATE POLICY "rfs_upd_auth" ON public.rfq_submissao
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.pode_ver_cliente(auth.uid(), cliente_id)
  );

-- INSERT público: aceita quando existe link aberto correspondente.
DROP POLICY IF EXISTS "rfs_ins_anon" ON public.rfq_submissao;
CREATE POLICY "rfs_ins_anon" ON public.rfq_submissao
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rfq_formulario_link l
      WHERE l.id = link_id
        AND l.cliente_id = rfq_submissao.cliente_id
        AND l.tipo_id = rfq_submissao.tipo_id
        AND l.status = 'aberto'
        AND (l.expira_em IS NULL OR l.expira_em > now())
    )
  );

-- =====================================================================
-- 5. ANEXOS DA SUBMISSÃO
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rfq_submissao_anexo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submissao_id uuid NOT NULL REFERENCES public.rfq_submissao(id) ON DELETE CASCADE,
  campo_id text,
  nome text NOT NULL,
  mime text,
  tamanho_bytes bigint,
  drive_file_id text,
  drive_view_url text,
  storage_bucket text,
  storage_path text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfsa_submissao ON public.rfq_submissao_anexo(submissao_id);

GRANT SELECT, INSERT ON public.rfq_submissao_anexo TO authenticated;
GRANT INSERT ON public.rfq_submissao_anexo TO anon;
GRANT ALL ON public.rfq_submissao_anexo TO service_role;

ALTER TABLE public.rfq_submissao_anexo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfsa_read_auth" ON public.rfq_submissao_anexo;
CREATE POLICY "rfsa_read_auth" ON public.rfq_submissao_anexo
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rfq_submissao s
      WHERE s.id = submissao_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'manager')
          OR public.pode_ver_cliente(auth.uid(), s.cliente_id)
        )
    )
  );

DROP POLICY IF EXISTS "rfsa_ins_anon" ON public.rfq_submissao_anexo;
CREATE POLICY "rfsa_ins_anon" ON public.rfq_submissao_anexo
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rfq_submissao s
      JOIN public.rfq_formulario_link l ON l.id = s.link_id
      WHERE s.id = submissao_id AND l.status IN ('aberto','preenchido')
    )
  );
