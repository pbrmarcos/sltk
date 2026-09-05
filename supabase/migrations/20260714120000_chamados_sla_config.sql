-- Configuração de SLA por (origem, prioridade) para chamados.
-- Substitui os valores hard-coded no gatilho tg_chamados_calc_sla e na função
-- chamados_gerar_alertas, permitindo ajustar prazos de resposta, resolução e
-- estagnação por categoria (origem) e prioridade.

CREATE TABLE IF NOT EXISTS public.chamado_sla_config (
  origem            public.chamado_origem      NOT NULL,
  prioridade        public.chamado_prioridade  NOT NULL,
  resposta_horas    integer NOT NULL CHECK (resposta_horas   > 0),
  resolucao_horas   integer NOT NULL CHECK (resolucao_horas  > 0),
  estagnado_horas   integer NOT NULL CHECK (estagnado_horas  > 0),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (origem, prioridade)
);

GRANT SELECT ON public.chamado_sla_config TO authenticated;
GRANT ALL    ON public.chamado_sla_config TO service_role;

ALTER TABLE public.chamado_sla_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sla_config_select_auth" ON public.chamado_sla_config;
CREATE POLICY "sla_config_select_auth"
  ON public.chamado_sla_config FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
    OR public.has_role(auth.uid(),'engineer'::app_role)
  );

DROP POLICY IF EXISTS "sla_config_write_admin" ON public.chamado_sla_config;
CREATE POLICY "sla_config_write_admin"
  ON public.chamado_sla_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role));

-- ================= Seed defaults =================
-- Regras: pós-venda (interno / site_publico) tem prazos mais curtos;
-- contato_site é comercial e tem prazos mais longos.
INSERT INTO public.chamado_sla_config (origem, prioridade, resposta_horas, resolucao_horas, estagnado_horas) VALUES
  ('site_publico','critica', 1,   4,   6),
  ('site_publico','alta',    4,   24,  24),
  ('site_publico','media',   8,   72,  48),
  ('site_publico','baixa',   24,  168, 96),
  ('interno','critica',      1,   4,   6),
  ('interno','alta',         4,   24,  24),
  ('interno','media',        8,   72,  48),
  ('interno','baixa',        24,  168, 96),
  ('contato_site','critica', 4,   24,  24),
  ('contato_site','alta',    8,   48,  48),
  ('contato_site','media',   24,  120, 72),
  ('contato_site','baixa',   48,  240, 120)
ON CONFLICT (origem, prioridade) DO NOTHING;

-- ================= Trigger de SLA usa a config =================
CREATE OR REPLACE FUNCTION public.tg_chamados_calc_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  base timestamptz;
BEGIN
  IF NEW.prioridade IS NULL THEN NEW.prioridade := 'media'; END IF;
  IF (TG_OP = 'INSERT')
     OR (NEW.prioridade IS DISTINCT FROM OLD.prioridade)
     OR (NEW.origem IS DISTINCT FROM OLD.origem) THEN
    SELECT resposta_horas, resolucao_horas
      INTO cfg
      FROM public.chamado_sla_config
     WHERE origem = NEW.origem AND prioridade = NEW.prioridade;
    IF NOT FOUND THEN
      -- Fallback conservador
      cfg.resposta_horas  := CASE NEW.prioridade WHEN 'critica' THEN 1 WHEN 'alta' THEN 4 WHEN 'media' THEN 8 ELSE 24 END;
      cfg.resolucao_horas := CASE NEW.prioridade WHEN 'critica' THEN 4 WHEN 'alta' THEN 24 WHEN 'media' THEN 72 ELSE 168 END;
    END IF;
    base := COALESCE(NEW.created_at, now());
    NEW.sla_resposta_at  := base + make_interval(hours => cfg.resposta_horas);
    NEW.sla_resolucao_at := base + make_interval(hours => cfg.resolucao_horas);
  END IF;
  RETURN NEW;
END; $$;

-- ================= Função de alertas usa estagnado_horas da config =================
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
  estag_hrs int;
BEGIN
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

    IF r.atendente_id IS NOT NULL THEN
      INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
      VALUES (r.atendente_id, 'chamado', r.id,
              'SLA estourado: ' || r.codigo,
              COALESCE(r.assunto, 'Chamado sem primeira resposta dentro do SLA.'),
              link_url);
    ELSE
      FOR destino IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','manager') LOOP
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

  FOR r IN
    SELECT c.id, c.codigo, c.atendente_id, c.assunto, c.ultima_mensagem_em, c.origem, c.prioridade,
           COALESCE(cfg.estagnado_horas, 48) AS estag_hrs
      FROM public.chamados c
      LEFT JOIN public.chamado_sla_config cfg
        ON cfg.origem = c.origem AND cfg.prioridade = c.prioridade
     WHERE c.status NOT IN ('resolvido','arquivado')
       AND c.ultima_mensagem_por = 'visitante'
       AND c.ultima_mensagem_em IS NOT NULL
       AND c.ultima_mensagem_em < now() - make_interval(hours => COALESCE(cfg.estagnado_horas, 48))
       AND (c.estagnado_alertado_em IS NULL OR c.estagnado_alertado_em < c.ultima_mensagem_em)
  LOOP
    link_url := '/pos-vendas/chamados/' || r.id::text;
    INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_nome, meta)
      VALUES (r.id, 'estagnado', 'Sistema',
              jsonb_build_object('ultima_mensagem_em', r.ultima_mensagem_em, 'estagnado_horas', r.estag_hrs));

    IF r.atendente_id IS NOT NULL THEN
      INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
      VALUES (r.atendente_id, 'chamado', r.id,
              'Chamado estagnado: ' || r.codigo,
              'Aguardando resposta interna há mais de ' || r.estag_hrs || 'h.',
              link_url);
    ELSE
      FOR destino IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','manager') LOOP
        INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
        VALUES (destino, 'chamado', r.id,
                'Chamado estagnado: ' || r.codigo,
                'Aguardando resposta interna há mais de ' || r.estag_hrs || 'h.',
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
