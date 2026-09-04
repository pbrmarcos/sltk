
-- ============================================================
-- 1. SEGMENTOS
-- ============================================================
CREATE TABLE public.segmentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX segmentos_nome_unique ON public.segmentos (lower(nome)) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.segmentos TO authenticated;
GRANT ALL ON public.segmentos TO service_role;
ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "segmentos_select_auth" ON public.segmentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "segmentos_insert_roles" ON public.segmentos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'sales'));
CREATE POLICY "segmentos_update_roles" ON public.segmentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE TRIGGER tg_segmentos_updated_at BEFORE UPDATE ON public.segmentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed dos 41 segmentos
INSERT INTO public.segmentos (nome) VALUES
('Açúcar'),('Amendoim'),('Arroz'),('Automotivo'),
('Azeites, gorduras e vinagres'),('Biomassa, carvões e chip lenha'),
('Bolachas'),('Café'),('Cereais matinais e granolas'),
('Chocolates, balas e guloseimas'),('Comida balanceada'),
('Condimentos e especiarias'),('Conservas'),
('Domossanitantes, detergentes e limpeza'),('Ervas e chás'),
('Farma e cosméticos'),('Feijão e legumes'),('Fertilizantes e adubo'),
('Frigoríficos e embutidos'),('Frutas e vegetais'),
('Gelatinas e sobremesas'),('Indústria de lácteos'),
('Lodo e subprodutos industriais'),('Marmeladas e geleias'),
('Massa'),('Milho'),('Minerais e indústria de construção'),
('Molhos e cremes'),('Panificação e confeitaria'),
('Plástico, polímeros e recicláveis'),('Químicos, aditivos e defensivos'),
('Quinoa, chia, sésamo e amaranto'),('Sal'),('Semente'),
('Snack'),('Sorvetes'),('Sucos e polpas'),('Tabaco'),
('Tintas, pinturas, resinas, pigmentos e vernizes'),
('Trigo'),('Vinho, destilados, cervejas e bebidas');

-- ============================================================
-- 2. LEAD_ORIGENS
-- ============================================================
CREATE TABLE public.lead_origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX lead_origens_nome_unique ON public.lead_origens (lower(nome)) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.lead_origens TO authenticated;
GRANT ALL ON public.lead_origens TO service_role;
ALTER TABLE public.lead_origens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_origens_select_auth" ON public.lead_origens FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_origens_insert_roles" ON public.lead_origens FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'sales'));
CREATE POLICY "lead_origens_update_roles" ON public.lead_origens FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE TRIGGER tg_lead_origens_updated_at BEFORE UPDATE ON public.lead_origens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 3. CLIENTES — novas colunas
-- ============================================================
ALTER TABLE public.clientes
  ADD COLUMN segmento_id uuid REFERENCES public.segmentos(id),
  ADD COLUMN lead_origem_id uuid REFERENCES public.lead_origens(id),
  -- Identidade extra
  ADD COLUMN site text,
  ADD COLUMN email_corporativo text,
  ADD COLUMN telefone_corporativo_ddi text,
  ADD COLUMN telefone_corporativo_numero text,
  ADD COLUMN ramal text,
  ADD COLUMN apelido text,
  ADD COLUMN matriz_filial text CHECK (matriz_filial IN ('matriz','filial')),
  -- Fiscal BR
  ADD COLUMN regime_tributario text CHECK (regime_tributario IN ('mei','simples','lucro_presumido','lucro_real')),
  ADD COLUMN cnae_principal text,
  ADD COLUMN cnaes_secundarios text[],
  ADD COLUMN natureza_juridica_codigo text,
  ADD COLUMN natureza_juridica_descricao text,
  ADD COLUMN situacao_cadastral text,
  ADD COLUMN data_situacao date,
  ADD COLUMN motivo_situacao text,
  ADD COLUMN data_abertura date,
  ADD COLUMN capital_social numeric(18,2),
  ADD COLUMN porte text,
  -- Redes sociais
  ADD COLUMN social_linkedin text,
  ADD COLUMN social_instagram text,
  ADD COLUMN social_facebook text,
  ADD COLUMN social_twitter text,
  ADD COLUMN social_whatsapp text,
  ADD COLUMN social_skype text;

CREATE INDEX clientes_segmento_id_idx ON public.clientes(segmento_id);
CREATE INDEX clientes_lead_origem_id_idx ON public.clientes(lead_origem_id);

-- Migração de dados: copia segmento (texto) para segmento_id
DO $$
DECLARE
  legado_id uuid;
BEGIN
  -- Garante que segmentos já cadastrados em texto ganhem registro
  INSERT INTO public.segmentos (nome)
  SELECT DISTINCT trim(c.segmento)
  FROM public.clientes c
  WHERE c.segmento IS NOT NULL
    AND trim(c.segmento) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.segmentos s
      WHERE lower(s.nome) = lower(trim(c.segmento)) AND s.deleted_at IS NULL
    );

  -- Faz o link por nome (case-insensitive)
  UPDATE public.clientes c
  SET segmento_id = s.id
  FROM public.segmentos s
  WHERE c.segmento IS NOT NULL
    AND lower(trim(c.segmento)) = lower(s.nome)
    AND s.deleted_at IS NULL;
END $$;

-- ============================================================
-- 4. CLIENTE_SOCIOS
-- ============================================================
CREATE TABLE public.cliente_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  qualificacao text,
  desde date,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX cliente_socios_cliente_id_idx ON public.cliente_socios(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_socios TO authenticated;
GRANT ALL ON public.cliente_socios TO service_role;
ALTER TABLE public.cliente_socios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_socios_select_auth" ON public.cliente_socios FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "cliente_socios_write_roles" ON public.cliente_socios FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'sales'));
CREATE POLICY "cliente_socios_update_roles" ON public.cliente_socios FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'sales'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'sales'));

CREATE TRIGGER tg_cliente_socios_updated_at BEFORE UPDATE ON public.cliente_socios
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 5. INTEGRACOES_CONFIG
-- ============================================================
CREATE TABLE public.integracoes_config (
  provider text PRIMARY KEY,
  pais text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT false,
  requer_chave boolean NOT NULL DEFAULT false,
  secret_name text,
  disponivel boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integracoes_config TO authenticated;
GRANT ALL ON public.integracoes_config TO service_role;
ALTER TABLE public.integracoes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integracoes_select_auth" ON public.integracoes_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "integracoes_update_admin" ON public.integracoes_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER tg_integracoes_updated_at BEFORE UPDATE ON public.integracoes_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.integracoes_config (provider, pais, nome, descricao, ativo, requer_chave, disponivel, ordem) VALUES
('brasilapi_cnpj','BR','BrasilAPI · CNPJ','Consulta gratuita à Receita Federal via BrasilAPI (preferencial).', true, false, true, 10),
('receitaws_cnpj','BR','ReceitaWS · CNPJ','Fallback automático caso BrasilAPI esteja indisponível.', true, false, true, 20),
('dgi_uy_rut','UY','DGI · RUT','Consulta pública da DGI Uruguai (razão social, situação).', true, false, true, 30),
('set_py_ruc','PY','SET · RUC','Consulta pública da SET Paraguai (razão social).', true, false, true, 40),
('sii_cl_rut','CL','SII · RUT','Sem API pública estável — apenas validação de dígito verificador.', false, false, false, 50),
('sat_mx_rfc','MX','SAT · RFC','Requer credenciais SAT — disponível em fase futura.', false, true, false, 60),
('afip_ar_cuit','AR','AFIP · CUIT','Requer credenciais AFIP — disponível em fase futura.', false, true, false, 70),
('dian_co_nit','CO','DIAN · NIT','Requer credenciais DIAN — disponível em fase futura.', false, true, false, 80),
('sunat_pe_ruc','PE','SUNAT · RUC','Requer credenciais SUNAT — disponível em fase futura.', false, true, false, 90);
