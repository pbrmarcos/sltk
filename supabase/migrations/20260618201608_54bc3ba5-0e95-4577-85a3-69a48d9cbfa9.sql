
-- 1. Add esquema_eletrico to existing doc categoria enum
ALTER TYPE public.equipamento_doc_categoria ADD VALUE IF NOT EXISTS 'esquema_eletrico';

-- 2. New enums
DO $$ BEGIN
  CREATE TYPE public.etp_status AS ENUM ('rascunho','em_revisao','aprovado','obsoleto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.etapa_fase AS ENUM ('engenharia','compras','fabricacao','montagem','qualidade','expedicao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.etapa_status AS ENUM ('pendente','em_andamento','concluida','atrasada','bloqueada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_disciplina AS ENUM ('mecanico','eletrico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_status AS ENUM ('em_elaboracao','em_aprovacao','liberado_producao','obsoleto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. equipamento_etps
CREATE TABLE IF NOT EXISTS public.equipamento_etps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  versao int NOT NULL DEFAULT 1,
  status public.etp_status NOT NULL DEFAULT 'rascunho',
  escopo text,
  premissas text,
  requisitos_funcionais text,
  requisitos_tecnicos text,
  criterios_aceite text,
  riscos text,
  aprovado_por uuid REFERENCES auth.users(id),
  aprovado_em timestamptz,
  drive_file_id text,
  drive_view_url text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(equipamento_id, versao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_etps TO authenticated;
GRANT ALL ON public.equipamento_etps TO service_role;
ALTER TABLE public.equipamento_etps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etps select via cliente"
  ON public.equipamento_etps FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
CREATE POLICY "etps insert via cliente"
  ON public.equipamento_etps FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
CREATE POLICY "etps update via cliente"
  ON public.equipamento_etps FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id)) WITH CHECK (public.can_access_cliente(cliente_id));

CREATE TRIGGER tg_equipamento_etps_updated
  BEFORE UPDATE ON public.equipamento_etps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_etps_equipamento ON public.equipamento_etps(equipamento_id) WHERE deleted_at IS NULL;

-- Trigger: aprovar uma versão marca anteriores como obsoletas
CREATE OR REPLACE FUNCTION public.tg_etp_aprovacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status <> 'aprovado') THEN
    NEW.aprovado_em := COALESCE(NEW.aprovado_em, now());
    NEW.aprovado_por := COALESCE(NEW.aprovado_por, auth.uid());
    UPDATE public.equipamento_etps
       SET status = 'obsoleto', updated_at = now()
     WHERE equipamento_id = NEW.equipamento_id
       AND id <> NEW.id
       AND status = 'aprovado';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_etp_aprovacao_trg
  BEFORE INSERT OR UPDATE ON public.equipamento_etps
  FOR EACH ROW EXECUTE FUNCTION public.tg_etp_aprovacao();

-- 4. equipamento_etapas
CREATE TABLE IF NOT EXISTS public.equipamento_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  nome text NOT NULL,
  fase public.etapa_fase NOT NULL DEFAULT 'engenharia',
  data_inicio_prev date,
  data_fim_prev date,
  data_inicio_real date,
  data_fim_real date,
  hh_mecanica_estimada numeric(10,2) NOT NULL DEFAULT 0,
  hh_eletrica_estimada numeric(10,2) NOT NULL DEFAULT 0,
  progresso int NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  status public.etapa_status NOT NULL DEFAULT 'pendente',
  predecessora_id uuid REFERENCES public.equipamento_etapas(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES auth.users(id),
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_etapas TO authenticated;
GRANT ALL ON public.equipamento_etapas TO service_role;
ALTER TABLE public.equipamento_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etapas select via cliente"
  ON public.equipamento_etapas FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
CREATE POLICY "etapas insert via cliente"
  ON public.equipamento_etapas FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
CREATE POLICY "etapas update via cliente"
  ON public.equipamento_etapas FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id)) WITH CHECK (public.can_access_cliente(cliente_id));

CREATE TRIGGER tg_equipamento_etapas_updated
  BEFORE UPDATE ON public.equipamento_etapas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_etapas_equipamento ON public.equipamento_etapas(equipamento_id, ordem) WHERE deleted_at IS NULL;

-- 5. equipamento_projetos
CREATE TABLE IF NOT EXISTS public.equipamento_projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  disciplina public.projeto_disciplina NOT NULL,
  revisao text NOT NULL DEFAULT 'R00',
  status public.projeto_status NOT NULL DEFAULT 'em_elaboracao',
  responsavel_id uuid REFERENCES auth.users(id),
  liberado_por uuid REFERENCES auth.users(id),
  liberado_em timestamptz,
  hh_consumida numeric(10,2) NOT NULL DEFAULT 0,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(equipamento_id, disciplina, revisao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_projetos TO authenticated;
GRANT ALL ON public.equipamento_projetos TO service_role;
ALTER TABLE public.equipamento_projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projetos select via cliente"
  ON public.equipamento_projetos FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
CREATE POLICY "projetos insert via cliente"
  ON public.equipamento_projetos FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
CREATE POLICY "projetos update via cliente"
  ON public.equipamento_projetos FOR UPDATE TO authenticated
  USING (public.can_access_cliente(cliente_id)) WITH CHECK (public.can_access_cliente(cliente_id));

CREATE TRIGGER tg_equipamento_projetos_updated
  BEFORE UPDATE ON public.equipamento_projetos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_projetos_equipamento ON public.equipamento_projetos(equipamento_id, disciplina) WHERE deleted_at IS NULL;

-- Trigger: liberar produção marca anteriores como obsoletas
CREATE OR REPLACE FUNCTION public.tg_projeto_liberacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'liberado_producao' AND (OLD.status IS NULL OR OLD.status <> 'liberado_producao') THEN
    NEW.liberado_em := COALESCE(NEW.liberado_em, now());
    NEW.liberado_por := COALESCE(NEW.liberado_por, auth.uid());
    UPDATE public.equipamento_projetos
       SET status = 'obsoleto', updated_at = now()
     WHERE equipamento_id = NEW.equipamento_id
       AND disciplina = NEW.disciplina
       AND id <> NEW.id
       AND status = 'liberado_producao';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_projeto_liberacao_trg
  BEFORE INSERT OR UPDATE ON public.equipamento_projetos
  FOR EACH ROW EXECUTE FUNCTION public.tg_projeto_liberacao();
