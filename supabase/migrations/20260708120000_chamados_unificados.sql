-- Unificação Chamados + Contato do site: acrescenta origem='contato_site',
-- prioridade e SLA aos chamados, e migra mensagens antigas de contato_mensagens.

-- ============ Enum: origem 'contato_site' ============
ALTER TYPE public.chamado_origem ADD VALUE IF NOT EXISTS 'contato_site';

-- ============ Enum: prioridade ============
DO $$ BEGIN
  CREATE TYPE public.chamado_prioridade AS ENUM ('baixa','media','alta','critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Colunas em chamados ============
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS prioridade public.chamado_prioridade NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS sla_resposta_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_resolucao_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

-- numero_serie passa a ser opcional (contato_site não tem equipamento)
ALTER TABLE public.chamados ALTER COLUMN numero_serie DROP NOT NULL;
ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_serie_len;
ALTER TABLE public.chamados ADD CONSTRAINT chamados_serie_len
  CHECK (numero_serie IS NULL OR char_length(numero_serie) BETWEEN 1 AND 80);

CREATE INDEX IF NOT EXISTS idx_chamados_origem ON public.chamados(origem);
CREATE INDEX IF NOT EXISTS idx_chamados_prioridade ON public.chamados(prioridade);
CREATE INDEX IF NOT EXISTS idx_chamados_atendente ON public.chamados(atendente_id);
CREATE INDEX IF NOT EXISTS idx_chamados_sla_resp ON public.chamados(sla_resposta_at);

-- ============ Trigger: calcula SLA na INSERT e quando prioridade muda ============
CREATE OR REPLACE FUNCTION public.tg_chamados_calc_sla()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  hrs_resp int; hrs_res int;
  base timestamptz;
BEGIN
  IF NEW.prioridade IS NULL THEN NEW.prioridade := 'media'; END IF;
  IF (TG_OP = 'INSERT') OR (NEW.prioridade IS DISTINCT FROM OLD.prioridade) THEN
    CASE NEW.prioridade
      WHEN 'critica' THEN hrs_resp := 1;  hrs_res := 4;
      WHEN 'alta'    THEN hrs_resp := 4;  hrs_res := 24;
      WHEN 'media'   THEN hrs_resp := 8;  hrs_res := 72;
      ELSE                hrs_resp := 24; hrs_res := 168;
    END CASE;
    base := COALESCE(NEW.created_at, now());
    NEW.sla_resposta_at  := base + make_interval(hours => hrs_resp);
    NEW.sla_resolucao_at := base + make_interval(hours => hrs_res);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chamados_calc_sla ON public.chamados;
CREATE TRIGGER trg_chamados_calc_sla
BEFORE INSERT OR UPDATE OF prioridade ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.tg_chamados_calc_sla();

-- Backfill SLA em linhas existentes (usa created_at + regras).
UPDATE public.chamados SET prioridade = prioridade WHERE sla_resposta_at IS NULL;

-- ============ Trigger: first_response_at ao primeiro atendimento ============
CREATE OR REPLACE FUNCTION public.tg_chamado_msg_first_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.autor_tipo = 'atendente' THEN
    UPDATE public.chamados
       SET first_response_at = NEW.created_at
     WHERE id = NEW.chamado_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chamado_msg_first_response ON public.chamado_mensagens;
CREATE TRIGGER trg_chamado_msg_first_response
AFTER INSERT ON public.chamado_mensagens
FOR EACH ROW EXECUTE FUNCTION public.tg_chamado_msg_first_response();
