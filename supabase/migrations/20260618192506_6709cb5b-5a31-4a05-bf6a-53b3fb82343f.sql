-- ============ TIPOS ============
DO $$ BEGIN
  CREATE TYPE public.equipamento_categoria AS ENUM
    ('envase','rotulagem','embalagem_secundaria','paletizacao','transporte','automacao','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipamento_status AS ENUM
    ('operacional','manutencao','parado','descomissionado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ SEQUENCE p/ código ============
CREATE SEQUENCE IF NOT EXISTS public.equipamentos_codigo_seq START 1;

-- ============ TABELA ============
CREATE TABLE public.cliente_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  codigo text UNIQUE,
  modelo text NOT NULL,
  fabricante text DEFAULT 'Solutek',
  numero_serie text,
  tag_cliente text,
  categoria public.equipamento_categoria NOT NULL DEFAULT 'outro',
  status public.equipamento_status NOT NULL DEFAULT 'operacional',
  data_entrega date,
  data_instalacao date,
  data_garantia_fim date,
  localizacao text,
  valor_venda numeric(18,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE INDEX idx_cliente_equipamentos_cliente ON public.cliente_equipamentos(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cliente_equipamentos_processo ON public.cliente_equipamentos(processo_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cliente_equipamentos_status ON public.cliente_equipamentos(status) WHERE deleted_at IS NULL;

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_equipamentos TO authenticated;
GRANT ALL ON public.cliente_equipamentos TO service_role;
GRANT USAGE ON SEQUENCE public.equipamentos_codigo_seq TO authenticated, service_role;

-- ============ RLS ============
ALTER TABLE public.cliente_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipamentos_select" ON public.cliente_equipamentos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));

CREATE POLICY "equipamentos_insert" ON public.cliente_equipamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));

CREATE POLICY "equipamentos_update" ON public.cliente_equipamentos
  FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id))
  WITH CHECK (public.can_access_cliente(cliente_id));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.tg_equipamentos_set_codigo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'EQP-' || to_char(now(),'YYYY') || '-'
      || lpad(nextval('public.equipamentos_codigo_seq')::text, 4, '0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_equipamentos_set_codigo
  BEFORE INSERT ON public.cliente_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_equipamentos_set_codigo();

CREATE OR REPLACE FUNCTION public.tg_equipamentos_set_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_equipamentos_set_updated
  BEFORE UPDATE ON public.cliente_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_equipamentos_set_updated();

-- ============ SEED ============
DO $$
DECLARE
  c1 uuid; c2 uuid; c3 uuid;
BEGIN
  SELECT id INTO c1 FROM public.clientes WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 0 LIMIT 1;
  SELECT id INTO c2 FROM public.clientes WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO c3 FROM public.clientes WHERE deleted_at IS NULL ORDER BY created_at ASC OFFSET 2 LIMIT 1;

  IF c1 IS NOT NULL THEN
    INSERT INTO public.cliente_equipamentos (cliente_id, modelo, numero_serie, categoria, status, data_entrega, data_instalacao, data_garantia_fim, localizacao, valor_venda, observacoes) VALUES
      (c1, 'Envasadora STK-Fill 8000', 'SN-2024-0142', 'envase', 'operacional', '2024-03-15', '2024-04-02', '2026-04-02', 'Linha 1 - Planta SP', 485000.00, 'Operando 24/7 com 92% de OEE.'),
      (c1, 'Rotuladora STK-Label R2', 'SN-2024-0157', 'rotulagem', 'operacional', '2024-03-15', '2024-04-05', '2026-04-05', 'Linha 1 - Planta SP', 215000.00, NULL),
      (c1, 'Paletizadora STK-Pal 1200', 'SN-2025-0033', 'paletizacao', 'manutencao', '2025-01-20', '2025-02-10', '2027-02-10', 'Linha 2 - Planta SP', 720000.00, 'Em manutenção preventiva agendada.');
  END IF;

  IF c2 IS NOT NULL THEN
    INSERT INTO public.cliente_equipamentos (cliente_id, modelo, numero_serie, categoria, status, data_entrega, data_instalacao, data_garantia_fim, localizacao, valor_venda) VALUES
      (c2, 'Envasadora STK-Fill 4000', 'SN-2023-0088', 'envase', 'operacional', '2023-08-10', '2023-09-01', '2025-09-01', 'Planta Matriz', 320000.00),
      (c2, 'Transportador STK-Conv 80m', 'SN-2023-0091', 'transporte', 'operacional', '2023-08-10', '2023-09-03', '2025-09-03', 'Planta Matriz', 145000.00);
  END IF;

  IF c3 IS NOT NULL THEN
    INSERT INTO public.cliente_equipamentos (cliente_id, modelo, numero_serie, categoria, status, data_entrega, data_instalacao, data_garantia_fim, localizacao, valor_venda, observacoes) VALUES
      (c3, 'Embaladora Secundária STK-Pack', 'SN-2022-0044', 'embalagem_secundaria', 'operacional', '2022-11-05', '2022-12-01', '2024-12-01', 'Linha A', 410000.00, 'Garantia expirada — em contrato de pós-venda.'),
      (c3, 'CLP de Automação STK-Auto X1', 'SN-2024-0210', 'automacao', 'parado', '2024-06-12', '2024-07-08', '2026-07-08', 'Linha A', 95000.00, 'Aguardando peça de reposição.');
  END IF;
END $$;