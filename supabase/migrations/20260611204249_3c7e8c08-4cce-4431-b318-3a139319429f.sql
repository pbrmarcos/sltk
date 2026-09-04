
-- ============================================================
-- v0.14.0 — Processos persistidos no banco (CRM pipeline)
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.processo_stage AS ENUM
    ('Qualificação','Proposta','Negociação','Implantação','Fechado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.processo_risco AS ENUM ('Baixo','Médio','Alto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.processo_evento_kind AS ENUM
    ('created','stage_change','task_created','email_sent','note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tarefa_status AS ENUM ('aberta','concluida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequência para o código PRJ-YYYY-NNN
CREATE SEQUENCE IF NOT EXISTS public.processos_codigo_seq START 100;

-- ============================================================
-- TABELA processos
-- ============================================================
CREATE TABLE public.processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  titulo text NOT NULL CHECK (length(titulo) BETWEEN 1 AND 255),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  pilar_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stage public.processo_stage NOT NULL DEFAULT 'Qualificação',
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  progresso int NOT NULL DEFAULT 5 CHECK (progresso BETWEEN 0 AND 100),
  risco public.processo_risco NOT NULL DEFAULT 'Médio',
  valor numeric(14,2),
  previsao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos TO authenticated;
GRANT ALL ON public.processos TO service_role;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE INDEX processos_stage_idx ON public.processos (stage) WHERE deleted_at IS NULL;
CREATE INDEX processos_pilar_idx ON public.processos (pilar_id) WHERE deleted_at IS NULL;
CREATE INDEX processos_cliente_idx ON public.processos (cliente_id) WHERE deleted_at IS NULL;

-- Trigger updated_at
CREATE TRIGGER processos_set_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trigger gerar código
CREATE OR REPLACE FUNCTION public.tg_processos_set_codigo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'PRJ-' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('public.processos_codigo_seq')::text, 3, '0');
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER processos_set_codigo
  BEFORE INSERT ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.tg_processos_set_codigo();

-- Trigger set updated_by
CREATE OR REPLACE FUNCTION public.tg_processos_set_updated_by()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_by := auth.uid();
  -- Se stage mudou, atualiza stage_entered_at
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER processos_set_updated_by
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.tg_processos_set_updated_by();

-- ============================================================
-- Função helper de acesso (security definer evita recursão RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_processo(_processo_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = _processo_id
      AND p.deleted_at IS NULL
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR p.pilar_id = auth.uid()
      )
  )
$$;

-- ============================================================
-- POLICIES processos
-- ============================================================
CREATE POLICY "processos_select" ON public.processos FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR pilar_id = auth.uid()
  )
);

CREATE POLICY "processos_insert" ON public.processos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'sales'::app_role)
);

CREATE POLICY "processos_update" ON public.processos FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR pilar_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR pilar_id = auth.uid()
);

-- DELETE físico bloqueado (sem policy de delete = nega tudo, exceto service_role)

-- ============================================================
-- TABELA processo_eventos
-- ============================================================
CREATE TABLE public.processo_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  kind public.processo_evento_kind NOT NULL,
  text text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT ON public.processo_eventos TO authenticated;
GRANT ALL ON public.processo_eventos TO service_role;
ALTER TABLE public.processo_eventos ENABLE ROW LEVEL SECURITY;
CREATE INDEX processo_eventos_proc_idx ON public.processo_eventos (processo_id, at DESC);

CREATE POLICY "processo_eventos_select" ON public.processo_eventos FOR SELECT TO authenticated
USING (public.can_access_processo(processo_id));
CREATE POLICY "processo_eventos_insert" ON public.processo_eventos FOR INSERT TO authenticated
WITH CHECK (public.can_access_processo(processo_id));

-- ============================================================
-- TABELA processo_tarefas
-- ============================================================
CREATE TABLE public.processo_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (length(titulo) BETWEEN 1 AND 255),
  pilar_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  prazo timestamptz NOT NULL,
  status public.tarefa_status NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.processo_tarefas TO authenticated;
GRANT ALL ON public.processo_tarefas TO service_role;
ALTER TABLE public.processo_tarefas ENABLE ROW LEVEL SECURITY;
CREATE INDEX processo_tarefas_proc_idx ON public.processo_tarefas (processo_id);
CREATE TRIGGER processo_tarefas_set_updated_at
  BEFORE UPDATE ON public.processo_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "processo_tarefas_select" ON public.processo_tarefas FOR SELECT TO authenticated
USING (public.can_access_processo(processo_id));
CREATE POLICY "processo_tarefas_insert" ON public.processo_tarefas FOR INSERT TO authenticated
WITH CHECK (public.can_access_processo(processo_id));
CREATE POLICY "processo_tarefas_update" ON public.processo_tarefas FOR UPDATE TO authenticated
USING (public.can_access_processo(processo_id))
WITH CHECK (public.can_access_processo(processo_id));

-- ============================================================
-- TABELA processo_emails
-- ============================================================
CREATE TABLE public.processo_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.processo_emails TO authenticated;
GRANT ALL ON public.processo_emails TO service_role;
ALTER TABLE public.processo_emails ENABLE ROW LEVEL SECURITY;
CREATE INDEX processo_emails_proc_idx ON public.processo_emails (processo_id, at DESC);

CREATE POLICY "processo_emails_select" ON public.processo_emails FOR SELECT TO authenticated
USING (public.can_access_processo(processo_id));
CREATE POLICY "processo_emails_insert" ON public.processo_emails FOR INSERT TO authenticated
WITH CHECK (public.can_access_processo(processo_id));

-- ============================================================
-- TABELA processo_notificacoes
-- ============================================================
CREATE TABLE public.processo_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  processo_id uuid REFERENCES public.processos(id) ON DELETE CASCADE,
  text text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.processo_notificacoes TO authenticated;
GRANT ALL ON public.processo_notificacoes TO service_role;
ALTER TABLE public.processo_notificacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX processo_notif_user_idx ON public.processo_notificacoes (user_id, read, at DESC);

CREATE POLICY "processo_notif_select_own" ON public.processo_notificacoes FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "processo_notif_update_own" ON public.processo_notificacoes FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Trigger de auditoria em processos
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_processos_audit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  col text;
  cols text[] := ARRAY['titulo','cliente_id','pilar_id','stage','progresso','risco','valor','previsao','deleted_at'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (auth.uid(), 'processos', NEW.id::text, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY cols LOOP
      IF to_jsonb(NEW) -> col IS DISTINCT FROM to_jsonb(OLD) -> col THEN
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        VALUES (auth.uid(), 'processos', NEW.id::text, 'UPDATE', col, to_jsonb(OLD) -> col, to_jsonb(NEW) -> col);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_value)
    VALUES (auth.uid(), 'processos', OLD.id::text, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER processos_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.tg_processos_audit();
