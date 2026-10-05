-- Motor de qualificação de leads com IA:
-- 1) prospeccao_config — perfil ideal de cliente (editável em Configurações),
--    nichos proibidos e regras duras que reprovam SEM gastar IA.
-- 2) mineracao_resultados ganha colunas de análise (grade A/B/C + detalhes).

CREATE TABLE public.prospeccao_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  perfil_ideal text NOT NULL DEFAULT '',
  nichos_proibidos text[] NOT NULL DEFAULT '{}',
  regras_duras jsonb NOT NULL DEFAULT '{"sem_contato": true, "doc_inativo": true, "mei": true}'::jsonb,
  max_leads_auto int NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.prospeccao_config (id, perfil_ideal, nichos_proibidos) VALUES (
  1,
  'Cliente ideal da SLTK Americas: indústria que FABRICA, ENVASA ou EMBALA produto físico em escala — alimentos, bebidas, laticínios, cosméticos, higiene e limpeza, químicos, farmacêutico, pet food, agroindústria (grãos, temperos, condimentos). Compra ou importa máquinas de envase, enchimento, dosagem, rotulagem, encartuchamento, encaixotamento, paletização ou linhas completas de embalagem. Prioridade para empresas com produção própria, porte médio ou grande, em expansão de linha ou modernização de planta na América Latina. Sinais positivos: importa equipamentos (NCM 8422/8428/8479), possui múltiplas plantas, marcas próprias no varejo. Sinais negativos: apenas revende produtos de terceiros, não tem produção própria, opera só serviços.',
  ARRAY[
    'varejo / revenda sem produção própria',
    'atacadista / distribuidor puro',
    'serviços (consultoria, agência, software)',
    'construção civil',
    'transportadora / logística pura',
    'restaurante / food service',
    'MEI / microempreendedor'
  ]
);

GRANT SELECT, UPDATE ON public.prospeccao_config TO authenticated;
GRANT ALL ON public.prospeccao_config TO service_role;
ALTER TABLE public.prospeccao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY prospeccao_config_select ON public.prospeccao_config
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'sales'::public.app_role)
  );
CREATE POLICY prospeccao_config_update ON public.prospeccao_config
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );

-- ============ Colunas de análise nos leads da mineração ============
ALTER TABLE public.mineracao_resultados
  ADD COLUMN IF NOT EXISTS analise_ia jsonb,
  ADD COLUMN IF NOT EXISTS analise_grade text CHECK (analise_grade IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS analise_status text NOT NULL DEFAULT 'pendente'
    CHECK (analise_status IN ('pendente','ok','erro')),
  ADD COLUMN IF NOT EXISTS analisado_em timestamptz;

NOTIFY pgrst, 'reload schema';
