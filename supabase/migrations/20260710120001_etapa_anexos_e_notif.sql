-- ============================================================================
-- Anexos por etapa (PDF/PNG/JPG até 25MB) + Menções em comentários + Notificações
-- ============================================================================

-- 1) Tabela de anexos
CREATE TABLE IF NOT EXISTS public.equipamento_etapa_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL REFERENCES public.equipamento_disciplina_etapas(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.cliente_equipamentos(id) ON DELETE CASCADE,
  cliente_id uuid,
  nome_arquivo text NOT NULL,
  mime text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  storage_path text NOT NULL,
  descricao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT etapa_anexo_mime_ok CHECK (mime IN ('application/pdf','image/png','image/jpeg')),
  CONSTRAINT etapa_anexo_size_ok CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 26214400)
);

CREATE INDEX IF NOT EXISTS idx_etapa_anexos_etapa ON public.equipamento_etapa_anexos(etapa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_etapa_anexos_eq ON public.equipamento_etapa_anexos(equipamento_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamento_etapa_anexos TO authenticated;
GRANT ALL ON public.equipamento_etapa_anexos TO service_role;
ALTER TABLE public.equipamento_etapa_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etapa_anexos_select" ON public.equipamento_etapa_anexos;
CREATE POLICY "etapa_anexos_select" ON public.equipamento_etapa_anexos
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "etapa_anexos_insert" ON public.equipamento_etapa_anexos;
CREATE POLICY "etapa_anexos_insert" ON public.equipamento_etapa_anexos
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
    OR public.has_role(auth.uid(),'engineer'::app_role)
  );

DROP POLICY IF EXISTS "etapa_anexos_update" ON public.equipamento_etapa_anexos;
CREATE POLICY "etapa_anexos_update" ON public.equipamento_etapa_anexos
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
    OR public.has_role(auth.uid(),'engineer'::app_role)
  );

-- 2) Menções em comentários
ALTER TABLE public.equipamento_etapa_comentarios
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}';

-- 3) Notificações in-app
CREATE TABLE IF NOT EXISTS public.notificacoes_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  origem text NOT NULL,
  origem_id uuid,
  titulo text NOT NULL,
  mensagem text,
  link text,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_nao_lida ON public.notificacoes_usuario(user_id, created_at DESC) WHERE lida_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_user_all ON public.notificacoes_usuario(user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notificacoes_usuario TO authenticated;
GRANT ALL ON public.notificacoes_usuario TO service_role;
ALTER TABLE public.notificacoes_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_self" ON public.notificacoes_usuario;
CREATE POLICY "notif_select_self" ON public.notificacoes_usuario
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_update_self" ON public.notificacoes_usuario;
CREATE POLICY "notif_update_self" ON public.notificacoes_usuario
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4) Trigger: cria notificação para cada usuário mencionado
CREATE OR REPLACE FUNCTION public.tg_etapa_coment_mencao_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid;
  et record;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT e.id, e.titulo, e.equipamento_id, e.disciplina, ce.cliente_id
    INTO et
  FROM public.equipamento_disciplina_etapas e
  JOIN public.cliente_equipamentos ce ON ce.id = e.equipamento_id
  WHERE e.id = NEW.etapa_id;

  FOREACH uid IN ARRAY NEW.mentions LOOP
    IF uid IS NOT NULL AND uid <> NEW.autor_id THEN
      INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
      VALUES (
        uid,
        'etapa_comentario',
        NEW.id,
        COALESCE(NEW.autor_nome,'Alguém') || ' te mencionou',
        left(COALESCE(NEW.texto,''), 240),
        '/clientes/' || et.cliente_id || '?equipamento=' || et.equipamento_id || '&etapa=' || et.id
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_etapa_coment_mencao_notify ON public.equipamento_etapa_comentarios;
CREATE TRIGGER trg_etapa_coment_mencao_notify
  AFTER INSERT ON public.equipamento_etapa_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.tg_etapa_coment_mencao_notify();

NOTIFY pgrst, 'reload schema';
