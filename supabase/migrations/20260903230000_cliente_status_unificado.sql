ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_status_check;
UPDATE public.clientes SET status = CASE WHEN status='inativo' THEN 'inativo' WHEN lifecycle_stage='cliente' THEN 'ativo' WHEN lifecycle_stage='suspect' THEN 'suspect' WHEN status='ativo' THEN 'ativo' ELSE 'prospect' END;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_status_check CHECK (status = ANY (ARRAY['ativo'::text,'suspect'::text,'prospect'::text,'inativo'::text]));
ALTER TABLE public.clientes ALTER COLUMN status SET DEFAULT 'suspect';
UPDATE public.clientes SET lifecycle_stage = CASE status WHEN 'ativo' THEN 'cliente'::public.cliente_lifecycle WHEN 'inativo' THEN 'inativo'::public.cliente_lifecycle WHEN 'suspect' THEN 'suspect'::public.cliente_lifecycle ELSE 'prospect'::public.cliente_lifecycle END;

CREATE OR REPLACE FUNCTION public.refresh_cliente_metrics(_cliente_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_op_abertas int; v_op_total int; v_proc_ativos int; v_proc_total int;
  v_valor_ganho numeric(18,2); v_primeiro_ganho timestamptz; v_status_atual text; v_novo_status text;
BEGIN
  IF _cliente_id IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) FILTER (WHERE o.pipeline_stage NOT IN ('ganho','perdido')), COUNT(*),
         COALESCE(SUM(o.valor_estimado) FILTER (WHERE o.pipeline_stage='ganho'),0),
         MIN(o.updated_at) FILTER (WHERE o.pipeline_stage='ganho')
    INTO v_op_abertas, v_op_total, v_valor_ganho, v_primeiro_ganho
  FROM public.oportunidades o WHERE o.cliente_id=_cliente_id AND o.deleted_at IS NULL;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE p.lost_at IS NULL) INTO v_proc_total, v_proc_ativos
  FROM public.processos p WHERE p.cliente_id=_cliente_id AND p.deleted_at IS NULL;
  SELECT status INTO v_status_atual FROM public.clientes WHERE id=_cliente_id;
  v_novo_status := CASE
    WHEN v_status_atual='inativo' THEN 'inativo'
    WHEN v_proc_total>0 THEN 'ativo'
    WHEN v_op_total>0 THEN 'prospect'
    WHEN v_status_atual='ativo' THEN 'ativo'
    ELSE COALESCE(v_status_atual,'suspect') END;
  UPDATE public.clientes
     SET oportunidades_abertas=COALESCE(v_op_abertas,0), processos_ativos=COALESCE(v_proc_ativos,0),
         processos_total=COALESCE(v_proc_total,0), valor_ganho_total=COALESCE(v_valor_ganho,0),
         status=v_novo_status,
         lifecycle_stage = CASE v_novo_status WHEN 'ativo' THEN 'cliente'::public.cliente_lifecycle WHEN 'inativo' THEN 'inativo'::public.cliente_lifecycle WHEN 'suspect' THEN 'suspect'::public.cliente_lifecycle ELSE 'prospect'::public.cliente_lifecycle END,
         tornou_cliente_em=COALESCE(tornou_cliente_em, v_primeiro_ganho)
   WHERE id=_cliente_id;
END $function$;

CREATE OR REPLACE FUNCTION public.tg_clientes_sync_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.lifecycle_stage := CASE NEW.status WHEN 'ativo' THEN 'cliente'::public.cliente_lifecycle WHEN 'inativo' THEN 'inativo'::public.cliente_lifecycle WHEN 'suspect' THEN 'suspect'::public.cliente_lifecycle ELSE 'prospect'::public.cliente_lifecycle END;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS clientes_sync_lifecycle ON public.clientes;
CREATE TRIGGER clientes_sync_lifecycle BEFORE INSERT OR UPDATE OF status ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.tg_clientes_sync_lifecycle();
