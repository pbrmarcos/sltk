-- 1) Novo tipo de processo
CREATE TYPE public.processo_tipo AS ENUM ('projeto', 'atendimento', 'instalacao');

-- 2) Expande o enum de estágios com os passos dos fluxos Atendimento e Instalação
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Solicitação';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Análise';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Registro';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Resolução';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Encerrado';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Preparação';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Agendamento';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Arranque';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Treinamento';
ALTER TYPE public.processo_stage ADD VALUE IF NOT EXISTS 'Entrega Técnica';

-- 3) Coluna Tipo no processo (todos os existentes ficam como 'projeto')
ALTER TABLE public.processos
  ADD COLUMN tipo public.processo_tipo NOT NULL DEFAULT 'projeto';

CREATE INDEX idx_processos_tipo ON public.processos(tipo) WHERE deleted_at IS NULL;

-- 4) Modelos de checklist (itens padrão por tipo + estágio)
CREATE TABLE public.processo_checklist_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.processo_tipo NOT NULL,
  stage public.processo_stage NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  label text NOT NULL,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.processo_checklist_template TO authenticated;
GRANT ALL ON public.processo_checklist_template TO service_role;
ALTER TABLE public.processo_checklist_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_template_select_authenticated"
  ON public.processo_checklist_template
  FOR SELECT TO authenticated
  USING (ativo = true);

CREATE INDEX idx_checklist_template_tipo_stage
  ON public.processo_checklist_template(tipo, stage, ordem)
  WHERE ativo = true;

CREATE TRIGGER set_updated_at_checklist_template
  BEFORE UPDATE ON public.processo_checklist_template
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5) Status do checklist por processo
CREATE TABLE public.processo_checklist_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.processo_checklist_template(id) ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (processo_id, template_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_checklist_status TO authenticated;
GRANT ALL ON public.processo_checklist_status TO service_role;
ALTER TABLE public.processo_checklist_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_status_select"
  ON public.processo_checklist_status
  FOR SELECT TO authenticated
  USING (public.can_access_processo(processo_id));

CREATE POLICY "checklist_status_insert"
  ON public.processo_checklist_status
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_processo(processo_id));

CREATE POLICY "checklist_status_update"
  ON public.processo_checklist_status
  FOR UPDATE TO authenticated
  USING (public.can_access_processo(processo_id))
  WITH CHECK (public.can_access_processo(processo_id));

CREATE POLICY "checklist_status_delete"
  ON public.processo_checklist_status
  FOR DELETE TO authenticated
  USING (public.can_access_processo(processo_id));

CREATE INDEX idx_checklist_status_processo ON public.processo_checklist_status(processo_id);

CREATE TRIGGER set_updated_at_checklist_status
  BEFORE UPDATE ON public.processo_checklist_status
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();