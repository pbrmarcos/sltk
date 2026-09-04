CREATE TABLE public.mineracao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  api_base_url text NOT NULL DEFAULT 'https://app.penta-transaction.com/PentaApi/api-v2',
  usuario text,
  senha text,
  pais_padrao text DEFAULT 'BR',
  delay_ms integer NOT NULL DEFAULT 600,
  limite_consultas_dia integer NOT NULL DEFAULT 1000,
  limite_bases integer NOT NULL DEFAULT 25,
  limite_bases_premium integer NOT NULL DEFAULT 15,
  limite_rubros integer NOT NULL DEFAULT 30,
  limite_empresas integer NOT NULL DEFAULT 1000,
  restricoes_sync jsonb,
  restricoes_sync_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE ON public.mineracao_config TO authenticated;
GRANT ALL ON public.mineracao_config TO service_role;
REVOKE SELECT (senha) ON public.mineracao_config FROM authenticated;
ALTER TABLE public.mineracao_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mineracao_config_admin_all" ON public.mineracao_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
INSERT INTO public.mineracao_config (singleton) VALUES (true);

CREATE TABLE public.mineracao_uso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL UNIQUE,
  bases jsonb NOT NULL DEFAULT '[]'::jsonb,
  bases_premium jsonb NOT NULL DEFAULT '[]'::jsonb,
  rubros jsonb NOT NULL DEFAULT '[]'::jsonb,
  empresas jsonb NOT NULL DEFAULT '[]'::jsonb,
  consultas_por_dia jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mineracao_uso TO authenticated;
GRANT ALL ON public.mineracao_uso TO service_role;
ALTER TABLE public.mineracao_uso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mineracao_uso_comercial" ON public.mineracao_uso FOR ALL TO authenticated
  USING (public.can_access_module(auth.uid(), 'comercial'))
  WITH CHECK (public.can_access_module(auth.uid(), 'comercial'));

CREATE TABLE public.mineracao_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  key_country text NOT NULL,
  key_operation text NOT NULL,
  key_version integer NOT NULL DEFAULT 1,
  base_titulo text,
  rubros text[] NOT NULL DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  filtro_empresa text,
  total_operacoes integer NOT NULL DEFAULT 0,
  total_empresas integer NOT NULL DEFAULT 0,
  valor_total numeric(18,2) NOT NULL DEFAULT 0,
  operacoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mineracao_campanhas TO authenticated;
GRANT ALL ON public.mineracao_campanhas TO service_role;
ALTER TABLE public.mineracao_campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mineracao_campanhas_comercial" ON public.mineracao_campanhas FOR ALL TO authenticated
  USING (public.can_access_module(auth.uid(), 'comercial'))
  WITH CHECK (public.can_access_module(auth.uid(), 'comercial'));

CREATE TABLE public.mineracao_resultados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.mineracao_campanhas(id) ON DELETE CASCADE,
  empresa text NOT NULL,
  documento text,
  pais text,
  operacoes integer NOT NULL DEFAULT 0,
  valor_total numeric(18,2) NOT NULL DEFAULT 0,
  rubros text[] NOT NULL DEFAULT '{}',
  primeira_operacao date,
  ultima_operacao date,
  convertido_oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL,
  convertido_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  convertido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mineracao_resultados_campanha_idx ON public.mineracao_resultados(campanha_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mineracao_resultados TO authenticated;
GRANT ALL ON public.mineracao_resultados TO service_role;
ALTER TABLE public.mineracao_resultados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mineracao_resultados_comercial" ON public.mineracao_resultados FOR ALL TO authenticated
  USING (public.can_access_module(auth.uid(), 'comercial'))
  WITH CHECK (public.can_access_module(auth.uid(), 'comercial'));

INSERT INTO public.lead_origens (nome, ativo)
SELECT 'Mineração Penta', true
WHERE NOT EXISTS (SELECT 1 FROM public.lead_origens WHERE nome = 'Mineração Penta');
