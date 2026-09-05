-- Chamados: comentários internos, novos eventos de timeline,
-- e notificações automáticas para SLA estourado / estagnado.

-- ============ Mensagens internas ============
ALTER TABLE public.chamado_mensagens
  ADD COLUMN IF NOT EXISTS interno boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chamado_mensagens_interno
  ON public.chamado_mensagens(chamado_id, interno);

-- first_response_at só conta mensagens externas (não internas).
CREATE OR REPLACE FUNCTION public.tg_chamado_msg_first_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.autor_tipo = 'atendente' AND NEW.interno = false THEN
    UPDATE public.chamados
       SET first_response_at = NEW.created_at
     WHERE id = NEW.chamado_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;

-- ============ Novos tipos de evento ============
DO $$ BEGIN
  ALTER TYPE public.chamado_evento_tipo ADD VALUE IF NOT EXISTS 'prioridade_change';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.chamado_evento_tipo ADD VALUE IF NOT EXISTS 'atendente_change';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.chamado_evento_tipo ADD VALUE IF NOT EXISTS 'sla_estourado';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.chamado_evento_tipo ADD VALUE IF NOT EXISTS 'estagnado';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.chamado_evento_tipo ADD VALUE IF NOT EXISTS 'comentario_interno';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Colunas de controle de alerta (idempotência) ============
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS sla_alertado_em timestamptz,
  ADD COLUMN IF NOT EXISTS estagnado_alertado_em timestamptz;

-- ============ Função: gerar alertas periódicos ============
CREATE OR REPLACE FUNCTION public.chamados_gerar_alertas()
RETURNS TABLE (sla_alertados int, estagnados_alertados int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  n_sla int := 0;
  n_est int := 0;
  destino uuid;
  link_url text;
BEGIN
  -- 1) SLA de resposta estourado sem primeira resposta e ainda não alertado.
  FOR r IN
    SELECT id, codigo, atendente_id, assunto, prioridade
      FROM public.chamados
     WHERE status NOT IN ('resolvido','arquivado')
       AND first_response_at IS NULL
       AND sla_resposta_at IS NOT NULL
       AND sla_resposta_at < now()
       AND sla_alertado_em IS NULL
  LOOP
    link_url := '/pos-vendas/chamados/' || r.id::text;
    INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_nome, meta)
      VALUES (r.id, 'sla_estourado', 'Sistema',
              jsonb_build_object('prioridade', r.prioridade));

    -- Notifica o atendente responsável (se houver); caso contrário, todos admins/managers.
    IF r.atendente_id IS NOT NULL THEN
      INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
      VALUES (r.atendente_id, 'chamado', r.id,
              'SLA estourado: ' || r.codigo,
              COALESCE(r.assunto, 'Chamado sem primeira resposta dentro do SLA.'),
              link_url);
    ELSE
      FOR destino IN
        SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','manager')
      LOOP
        INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
        VALUES (destino, 'chamado', r.id,
                'SLA estourado: ' || r.codigo,
                'Chamado sem atendente e sem resposta dentro do SLA.',
                link_url);
      END LOOP;
    END IF;

    UPDATE public.chamados SET sla_alertado_em = now() WHERE id = r.id;
    n_sla := n_sla + 1;
  END LOOP;

  -- 2) Estagnado: aguardando resposta interna há mais de 48h e ainda não alertado
  --    (última mensagem do visitante e sem nova interação desde então).
  FOR r IN
    SELECT id, codigo, atendente_id, assunto, ultima_mensagem_em
      FROM public.chamados
     WHERE status NOT IN ('resolvido','arquivado')
       AND ultima_mensagem_por = 'visitante'
       AND ultima_mensagem_em IS NOT NULL
       AND ultima_mensagem_em < now() - interval '48 hours'
       AND (estagnado_alertado_em IS NULL OR estagnado_alertado_em < ultima_mensagem_em)
  LOOP
    link_url := '/pos-vendas/chamados/' || r.id::text;
    INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_nome, meta)
      VALUES (r.id, 'estagnado', 'Sistema',
              jsonb_build_object('ultima_mensagem_em', r.ultima_mensagem_em));

    IF r.atendente_id IS NOT NULL THEN
      INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
      VALUES (r.atendente_id, 'chamado', r.id,
              'Chamado estagnado: ' || r.codigo,
              'Aguardando resposta interna há mais de 48h.',
              link_url);
    ELSE
      FOR destino IN
        SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','manager')
      LOOP
        INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
        VALUES (destino, 'chamado', r.id,
                'Chamado estagnado: ' || r.codigo,
                'Aguardando resposta interna há mais de 48h.',
                link_url);
      END LOOP;
    END IF;

    UPDATE public.chamados SET estagnado_alertado_em = now() WHERE id = r.id;
    n_est := n_est + 1;
  END LOOP;

  sla_alertados := n_sla;
  estagnados_alertados := n_est;
  RETURN NEXT;
END; $$;

-- ============ Agendar via pg_cron a cada 15 minutos ============
DO $$
DECLARE
  jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'chamados_gerar_alertas_15m';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
  PERFORM cron.schedule(
    'chamados_gerar_alertas_15m',
    '*/15 * * * *',
    $CRON$ SELECT public.chamados_gerar_alertas(); $CRON$
  );
END $$;
