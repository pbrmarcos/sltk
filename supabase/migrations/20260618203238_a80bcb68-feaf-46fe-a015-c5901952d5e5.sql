
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.montagem_status AS ENUM ('nao_iniciada','em_andamento','concluida','bloqueada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.revisao_disciplina AS ENUM ('mecanica','eletrica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.revisao_status AS ENUM ('pendente','em_andamento','aprovada','aprovada_com_ressalvas','reprovada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ MONTAGEM ============
CREATE TABLE public.equipamento_montagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  status public.montagem_status NOT NULL DEFAULT 'nao_iniciada',
  progresso int NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  inicio_previsto date,
  fim_previsto date,
  inicio_real date,
  fim_real date,
  responsavel_id uuid REFERENCES auth.users(id),
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_montagens_equipamento ON public.equipamento_montagens(equipamento_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_montagens_cliente ON public.equipamento_montagens(cliente_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_montagens TO authenticated;
GRANT ALL ON public.equipamento_montagens TO service_role;

ALTER TABLE public.equipamento_montagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY montagens_select ON public.equipamento_montagens
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
CREATE POLICY montagens_insert ON public.equipamento_montagens
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
CREATE POLICY montagens_update ON public.equipamento_montagens
  FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id))
  WITH CHECK (public.can_access_cliente(cliente_id));

CREATE TRIGGER tg_montagens_updated_at
  BEFORE UPDATE ON public.equipamento_montagens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ REVISÕES (mecanica/eletrica) ============
CREATE TABLE public.equipamento_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  disciplina public.revisao_disciplina NOT NULL,
  numero int NOT NULL DEFAULT 1,
  status public.revisao_status NOT NULL DEFAULT 'pendente',
  projeto_id uuid REFERENCES public.equipamento_projetos(id),
  inspetor_id uuid REFERENCES auth.users(id),
  data_inspecao date,
  itens_verificados int NOT NULL DEFAULT 0,
  itens_totais int NOT NULL DEFAULT 0,
  nao_conformidades int NOT NULL DEFAULT 0,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_revisoes_equipamento ON public.equipamento_revisoes(equipamento_id, disciplina) WHERE deleted_at IS NULL;
CREATE INDEX idx_revisoes_cliente ON public.equipamento_revisoes(cliente_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_revisoes TO authenticated;
GRANT ALL ON public.equipamento_revisoes TO service_role;

ALTER TABLE public.equipamento_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY revisoes_select ON public.equipamento_revisoes
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
CREATE POLICY revisoes_insert ON public.equipamento_revisoes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
CREATE POLICY revisoes_update ON public.equipamento_revisoes
  FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id))
  WITH CHECK (public.can_access_cliente(cliente_id));

CREATE TRIGGER tg_revisoes_updated_at
  BEFORE UPDATE ON public.equipamento_revisoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
