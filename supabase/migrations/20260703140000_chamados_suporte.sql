-- Módulo Pós-venda: Chamados de suporte
-- Fluxo: visitante abre no site público (rota /p/suporte/novo) com nº de série
-- e recebe (codigo + token). O código é curto (para exibir) e o token é longo
-- (secreto — só o hash é persistido). Atendimento interno em /pos-vendas/chamados
-- é restrito a admin/manager/engineer. Toda mutação é auditada em audit_log via
-- triggers, no mesmo padrão de oportunidades/sat_relatorio.

DO $$ BEGIN
  CREATE TYPE public.chamado_status AS ENUM (
    'aberto','em_analise','aguardando_cliente','resolvido','reaberto','arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chamado_origem AS ENUM ('site_publico','interno');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chamado_evento_tipo AS ENUM (
    'criado','mensagem','status_change','assumido','vinculado_equipamento',
    'resolvido','reaberto','notificacao_pendente','arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chamado_autor_tipo AS ENUM ('visitante','atendente','sistema');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS public.chamados_codigo_seq;

-- ================= Tabela principal =================
CREATE TABLE IF NOT EXISTS public.chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  token_hash text UNIQUE NOT NULL,
  status public.chamado_status NOT NULL DEFAULT 'aberto',
  origem public.chamado_origem NOT NULL DEFAULT 'site_publico',
  visitante_nome text NOT NULL,
  visitante_email text NOT NULL,
  visitante_telefone text,
  numero_serie text NOT NULL,
  equipamento_id uuid REFERENCES public.cliente_equipamentos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  descricao_inicial text NOT NULL,
  assunto text,
  atendente_id uuid,
  atendente_nome text,
  ip_criacao inet,
  user_agent text,
  ultima_mensagem_em timestamptz,
  ultima_mensagem_por public.chamado_autor_tipo,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,
  reaberto_em timestamptz,
  CONSTRAINT chamados_nome_len CHECK (char_length(visitante_nome) BETWEEN 1 AND 120),
  CONSTRAINT chamados_email_len CHECK (char_length(visitante_email) BETWEEN 3 AND 255),
  CONSTRAINT chamados_serie_len CHECK (char_length(numero_serie) BETWEEN 1 AND 80),
  CONSTRAINT chamados_descricao_len CHECK (char_length(descricao_inicial) BETWEEN 3 AND 4000)
);

CREATE INDEX IF NOT EXISTS idx_chamados_status         ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_created        ON public.chamados(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_equipamento    ON public.chamados(equipamento_id);
CREATE INDEX IF NOT EXISTS idx_chamados_email_criado   ON public.chamados(visitante_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_ip_criado      ON public.chamados(ip_criacao, created_at DESC);

-- ================= Mensagens =================
CREATE TABLE IF NOT EXISTS public.chamado_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  autor_tipo public.chamado_autor_tipo NOT NULL,
  autor_id uuid,
  autor_nome text NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chamado_msg_len CHECK (char_length(conteudo) BETWEEN 1 AND 4000)
);
CREATE INDEX IF NOT EXISTS idx_chamado_msg_chamado ON public.chamado_mensagens(chamado_id, created_at);

-- ================= Eventos (timeline dedicada) =================
CREATE TABLE IF NOT EXISTS public.chamado_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  tipo public.chamado_evento_tipo NOT NULL,
  from_status public.chamado_status,
  to_status public.chamado_status,
  autor_id uuid,
  autor_nome text,
  meta jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chamado_eventos_chamado ON public.chamado_eventos(chamado_id, at DESC);

-- ================= Grants =================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamado_mensagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamado_eventos   TO authenticated;
GRANT ALL ON public.chamados          TO service_role;
GRANT ALL ON public.chamado_mensagens TO service_role;
GRANT ALL ON public.chamado_eventos   TO service_role;
GRANT USAGE ON SEQUENCE public.chamados_codigo_seq TO authenticated, service_role;

-- ================= RLS =================
ALTER TABLE public.chamados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_eventos   ENABLE ROW LEVEL SECURITY;

-- Somente admin/manager/engineer têm acesso via cliente autenticado.
-- Escrita pelo público passa por server function com supabaseAdmin (bypassa RLS).
DROP POLICY IF EXISTS "chamados_select" ON public.chamados;
CREATE POLICY "chamados_select" ON public.chamados FOR SELECT USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
);

DROP POLICY IF EXISTS "chamados_update" ON public.chamados;
CREATE POLICY "chamados_update" ON public.chamados FOR UPDATE USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
);

DROP POLICY IF EXISTS "chamados_insert" ON public.chamados;
CREATE POLICY "chamados_insert" ON public.chamados FOR INSERT WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
);

DROP POLICY IF EXISTS "chamado_msg_select" ON public.chamado_mensagens;
CREATE POLICY "chamado_msg_select" ON public.chamado_mensagens FOR SELECT USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
);
DROP POLICY IF EXISTS "chamado_msg_insert" ON public.chamado_mensagens;
CREATE POLICY "chamado_msg_insert" ON public.chamado_mensagens FOR INSERT WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
);

DROP POLICY IF EXISTS "chamado_ev_select" ON public.chamado_eventos;
CREATE POLICY "chamado_ev_select" ON public.chamado_eventos FOR SELECT USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
);
DROP POLICY IF EXISTS "chamado_ev_insert" ON public.chamado_eventos;
CREATE POLICY "chamado_ev_insert" ON public.chamado_eventos FOR INSERT WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'manager')
  OR public.has_role(auth.uid(),'engineer')
);

-- ================= Triggers =================
CREATE OR REPLACE FUNCTION public.tg_chamados_touch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chamados_touch ON public.chamados;
CREATE TRIGGER trg_chamados_touch BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.tg_chamados_touch();

-- Registra alterações de status e da atribuição em chamado_eventos + audit_log.
CREATE OR REPLACE FUNCTION public.tg_chamados_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (auth.uid(), 'chamados', NEW.id::text, 'INSERT', to_jsonb(NEW));
    INSERT INTO public.chamado_eventos (chamado_id, tipo, to_status, autor_nome, meta)
    VALUES (NEW.id, 'criado', NEW.status, COALESCE(NEW.visitante_nome,'sistema'),
      jsonb_build_object('origem', NEW.origem));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
      VALUES (auth.uid(), 'chamados', NEW.id::text, 'UPDATE', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
      INSERT INTO public.chamado_eventos (chamado_id, tipo, from_status, to_status, autor_id, autor_nome)
      VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid(),
        (SELECT COALESCE(full_name, email, 'Sistema') FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NEW.atendente_id IS DISTINCT FROM OLD.atendente_id AND NEW.atendente_id IS NOT NULL THEN
      INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_id, autor_nome)
      VALUES (NEW.id, 'assumido', NEW.atendente_id, NEW.atendente_nome);
    END IF;
    IF NEW.equipamento_id IS DISTINCT FROM OLD.equipamento_id AND NEW.equipamento_id IS NOT NULL THEN
      INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_id, autor_nome, meta)
      VALUES (NEW.id, 'vinculado_equipamento', auth.uid(),
        (SELECT COALESCE(full_name, email, 'Sistema') FROM public.profiles WHERE id = auth.uid()),
        jsonb_build_object('equipamento_id', NEW.equipamento_id));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_chamados_audit ON public.chamados;
CREATE TRIGGER trg_chamados_audit AFTER INSERT OR UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.tg_chamados_audit();

-- Atualiza últimas-mensagens no chamado e alimenta chamado_eventos.
CREATE OR REPLACE FUNCTION public.tg_chamado_msg_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chamados
     SET ultima_mensagem_em  = NEW.created_at,
         ultima_mensagem_por = NEW.autor_tipo,
         updated_at          = now(),
         -- Ao responder o atendente, muda para 'aguardando_cliente'.
         -- Ao responder o visitante, se estava 'aguardando_cliente' volta a 'em_analise'.
         status = CASE
           WHEN NEW.autor_tipo = 'atendente' AND status IN ('aberto','em_analise','reaberto') THEN 'aguardando_cliente'::chamado_status
           WHEN NEW.autor_tipo = 'visitante' AND status = 'aguardando_cliente' THEN 'em_analise'::chamado_status
           WHEN NEW.autor_tipo = 'visitante' AND status = 'aberto' THEN 'em_analise'::chamado_status
           ELSE status
         END
   WHERE id = NEW.chamado_id;

  INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_id, autor_nome, meta)
  VALUES (NEW.chamado_id, 'mensagem', NEW.autor_id, NEW.autor_nome,
    jsonb_build_object('autor_tipo', NEW.autor_tipo, 'preview', left(NEW.conteudo, 200)));

  INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
  VALUES (auth.uid(), 'chamado_mensagens', NEW.id::text, 'INSERT', to_jsonb(NEW));

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chamado_msg_after_insert ON public.chamado_mensagens;
CREATE TRIGGER trg_chamado_msg_after_insert AFTER INSERT ON public.chamado_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.tg_chamado_msg_after_insert();

NOTIFY pgrst, 'reload schema';
