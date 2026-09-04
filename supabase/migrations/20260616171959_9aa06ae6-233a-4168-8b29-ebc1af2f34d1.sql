-- ============================================================================
-- 1) CHECKLIST ACTIONS (append-only log + last-action snapshot)
-- ============================================================================

CREATE TYPE public.checklist_acao AS ENUM (
  'marcou_ok','marcou_nok','marcou_na','desmarcou','comentou','anexou','removeu_anexo'
);

CREATE TABLE public.processo_checklist_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.processo_checklist_status(id) ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  acao public.checklist_acao NOT NULL,
  comentario text,
  anexo_id uuid,
  user_id uuid REFERENCES auth.users(id),
  user_nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_acoes_status ON public.processo_checklist_acoes(status_id, created_at DESC);
CREATE INDEX idx_checklist_acoes_processo ON public.processo_checklist_acoes(processo_id, created_at DESC);

GRANT SELECT, INSERT ON public.processo_checklist_acoes TO authenticated;
GRANT ALL ON public.processo_checklist_acoes TO service_role;

ALTER TABLE public.processo_checklist_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_acoes_select" ON public.processo_checklist_acoes
  FOR SELECT TO authenticated
  USING (public.can_access_processo(processo_id));

CREATE POLICY "checklist_acoes_insert" ON public.processo_checklist_acoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_processo(processo_id)
    AND user_id = auth.uid()
  );

-- snapshot columns
ALTER TABLE public.processo_checklist_status
  ADD COLUMN IF NOT EXISTS last_action_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_action_by_nome text,
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_comentario text;

-- trigger: auto-record action on status change
CREATE OR REPLACE FUNCTION public.tg_checklist_status_log_acao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acao public.checklist_acao;
  v_nome text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.done IS NOT DISTINCT FROM OLD.done
     AND NEW.observacao IS NOT DISTINCT FROM OLD.observacao THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email, 'Sistema') INTO v_nome
  FROM public.profiles WHERE id = auth.uid();
  v_nome := COALESCE(v_nome, 'Sistema');

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.done IS DISTINCT FROM OLD.done) THEN
    IF NEW.done THEN
      v_acao := 'marcou_ok';
    ELSE
      v_acao := 'desmarcou';
    END IF;

    INSERT INTO public.processo_checklist_acoes
      (status_id, processo_id, acao, comentario, user_id, user_nome)
    VALUES
      (NEW.id, NEW.processo_id, v_acao, NEW.observacao, auth.uid(), v_nome);

    NEW.last_action_by := auth.uid();
    NEW.last_action_by_nome := v_nome;
    NEW.last_action_at := now();
    NEW.last_comentario := NEW.observacao;
  ELSIF TG_OP = 'UPDATE' AND NEW.observacao IS DISTINCT FROM OLD.observacao THEN
    INSERT INTO public.processo_checklist_acoes
      (status_id, processo_id, acao, comentario, user_id, user_nome)
    VALUES
      (NEW.id, NEW.processo_id, 'comentou', NEW.observacao, auth.uid(), v_nome);
    NEW.last_action_by := auth.uid();
    NEW.last_action_by_nome := v_nome;
    NEW.last_action_at := now();
    NEW.last_comentario := NEW.observacao;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_checklist_status_log_acao ON public.processo_checklist_status;
CREATE TRIGGER trg_checklist_status_log_acao
  BEFORE INSERT OR UPDATE ON public.processo_checklist_status
  FOR EACH ROW EXECUTE FUNCTION public.tg_checklist_status_log_acao();

-- ============================================================================
-- 2) PROJECT TEMPLATES
-- ============================================================================

CREATE TYPE public.template_evento_tipo AS ENUM (
  'kickoff','fat','embarque','instalacao','treinamento','outro'
);

CREATE TABLE public.processo_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo public.processo_tipo NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.processo_template_checklist_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.processo_templates(id) ON DELETE CASCADE,
  secao text NOT NULL DEFAULT 'Geral',
  ordem int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT false,
  requer_arquivo boolean NOT NULL DEFAULT false,
  tipos_arquivo_aceitos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.processo_template_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.processo_templates(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  descricao text,
  dias_apos_inicio int NOT NULL DEFAULT 0,
  responsavel_role public.app_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.processo_template_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.processo_templates(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  tipo public.template_evento_tipo NOT NULL DEFAULT 'outro',
  dias_apos_inicio int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tpl_checklist_template ON public.processo_template_checklist_itens(template_id, ordem);
CREATE INDEX idx_tpl_tarefas_template ON public.processo_template_tarefas(template_id, ordem);
CREATE INDEX idx_tpl_eventos_template ON public.processo_template_eventos(template_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_template_checklist_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_template_tarefas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_template_eventos TO authenticated;
GRANT ALL ON public.processo_templates TO service_role;
GRANT ALL ON public.processo_template_checklist_itens TO service_role;
GRANT ALL ON public.processo_template_tarefas TO service_role;
GRANT ALL ON public.processo_template_eventos TO service_role;

ALTER TABLE public.processo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_template_checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_template_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_template_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl_select" ON public.processo_templates
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "tpl_write" ON public.processo_templates
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  );

-- children: inherit from parent
CREATE POLICY "tpl_ck_select" ON public.processo_template_checklist_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processo_templates t WHERE t.id = template_id AND t.deleted_at IS NULL));
CREATE POLICY "tpl_ck_write" ON public.processo_template_checklist_itens
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  );

CREATE POLICY "tpl_tk_select" ON public.processo_template_tarefas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processo_templates t WHERE t.id = template_id AND t.deleted_at IS NULL));
CREATE POLICY "tpl_tk_write" ON public.processo_template_tarefas
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  );

CREATE POLICY "tpl_ev_select" ON public.processo_template_eventos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.processo_templates t WHERE t.id = template_id AND t.deleted_at IS NULL));
CREATE POLICY "tpl_ev_write" ON public.processo_template_eventos
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'manager') OR
    public.has_role(auth.uid(),'engineer')
  );

CREATE TRIGGER trg_tpl_updated_at BEFORE UPDATE ON public.processo_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_tpl_ck_updated_at BEFORE UPDATE ON public.processo_template_checklist_itens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_tpl_tk_updated_at BEFORE UPDATE ON public.processo_template_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_tpl_ev_updated_at BEFORE UPDATE ON public.processo_template_eventos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================================
-- 3) PROJECT ATTACHMENTS (Google Drive metadata)
-- ============================================================================

CREATE TABLE public.processo_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  checklist_status_id uuid REFERENCES public.processo_checklist_status(id) ON DELETE SET NULL,
  drive_file_id text NOT NULL,
  drive_view_url text,
  drive_folder_id text,
  nome_final text NOT NULL,
  nome_original text NOT NULL,
  mime_type text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  sugestoes_ia jsonb,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_anexos_processo ON public.processo_anexos(processo_id, created_at DESC);
CREATE INDEX idx_anexos_checklist ON public.processo_anexos(checklist_status_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.processo_anexos TO authenticated;
GRANT ALL ON public.processo_anexos TO service_role;

ALTER TABLE public.processo_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anexos_select" ON public.processo_anexos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_processo(processo_id));

CREATE POLICY "anexos_insert" ON public.processo_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_processo(processo_id) AND user_id = auth.uid());

CREATE POLICY "anexos_soft_delete" ON public.processo_anexos
  FOR UPDATE TO authenticated
  USING (public.can_access_processo(processo_id))
  WITH CHECK (public.can_access_processo(processo_id));