-- =============================================================
-- Base ausente do histórico de migrations: documento_tipos e
-- documento_blocos foram criadas originalmente direto via SQL Editor
-- em produção (nunca capturadas como migration) — a migration seguinte
-- (20260623120000_doc_blocos_v2_seed.sql) já assume as duas tabelas
-- existentes. Reconstruído a partir do schema publicado em
-- src/integrations/supabase/types.ts (gerado contra produção) e do
-- uso em src/lib/docs/*. Idempotente — seguro rodar mesmo se as
-- tabelas já existirem (ex.: produção).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.documento_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  prefixo_codigo text NOT NULL DEFAULT '',
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.documento_tipos TO authenticated;
GRANT ALL ON public.documento_tipos TO service_role;

ALTER TABLE public.documento_tipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem tipos de documento" ON public.documento_tipos;
CREATE POLICY "Autenticados leem tipos de documento"
  ON public.documento_tipos FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin gerencia tipos de documento" ON public.documento_tipos;
CREATE POLICY "Admin gerencia tipos de documento"
  ON public.documento_tipos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed do tipo "orcamento" (usado como default por
-- src/components/orcamento/OrcamentoWizard.tsx) vive em
-- 20260623115959_documento_tipos_orcamento_seed.sql.

CREATE TABLE IF NOT EXISTS public.documento_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_codigo text NOT NULL REFERENCES public.documento_tipos(codigo) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ordem_padrao int NOT NULL DEFAULT 0,
  obrigatorio boolean NOT NULL DEFAULT false,
  largura int NOT NULL DEFAULT 100,
  conteudo_pt jsonb NOT NULL DEFAULT '{}'::jsonb,
  conteudo_es jsonb NOT NULL DEFAULT '{}'::jsonb,
  conteudo_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  variaveis_obrigatorias text[] NOT NULL DEFAULT '{}'::text[],
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.documento_blocos
    ADD CONSTRAINT documento_blocos_tipo_codigo_unq UNIQUE (tipo_codigo, codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON public.documento_blocos TO authenticated;
GRANT ALL ON public.documento_blocos TO service_role;

ALTER TABLE public.documento_blocos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem blocos ativos" ON public.documento_blocos;
CREATE POLICY "Autenticados leem blocos ativos"
  ON public.documento_blocos FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin/Manager gerenciam blocos" ON public.documento_blocos;
CREATE POLICY "Admin/Manager gerenciam blocos"
  ON public.documento_blocos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX IF NOT EXISTS idx_documento_blocos_tipo ON public.documento_blocos (tipo_codigo, ordem_padrao);
