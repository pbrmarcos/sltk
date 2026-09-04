-- Migra contato_mensagens/contato_respostas para chamados/chamado_mensagens.
-- Idempotente: só migra linhas com chamado_id ainda nulo.

ALTER TABLE public.contato_mensagens
  ADD COLUMN IF NOT EXISTS chamado_id uuid REFERENCES public.chamados(id) ON DELETE SET NULL;

ALTER TABLE public.chamados DISABLE TRIGGER trg_chamados_audit;
ALTER TABLE public.chamado_mensagens DISABLE TRIGGER trg_chamado_msg_after_insert;
ALTER TABLE public.chamado_mensagens DISABLE TRIGGER trg_chamado_msg_first_response;

DO $$
DECLARE
  r record;
  new_id uuid;
BEGIN
  FOR r IN
    SELECT * FROM public.contato_mensagens WHERE chamado_id IS NULL ORDER BY created_at
  LOOP
    INSERT INTO public.chamados (
      codigo, token_hash, status, origem, prioridade,
      visitante_nome, visitante_email, visitante_telefone,
      numero_serie, descricao_inicial, assunto,
      atendente_id, atendente_nome,
      ip_criacao, user_agent,
      ultima_mensagem_em, ultima_mensagem_por,
      created_at, updated_at, first_response_at
    ) VALUES (
      'MSG-' || lpad(nextval('public.chamados_codigo_seq')::text, 6, '0'),
      encode(gen_random_bytes(32), 'hex'),
      CASE r.status
        WHEN 'novo' THEN 'aberto'::public.chamado_status
        WHEN 'lido' THEN 'em_analise'::public.chamado_status
        WHEN 'respondido' THEN 'aguardando_cliente'::public.chamado_status
        WHEN 'arquivado' THEN 'arquivado'::public.chamado_status
        ELSE 'aberto'::public.chamado_status
      END,
      'contato_site'::public.chamado_origem,
      'media'::public.chamado_prioridade,
      r.nome, lower(r.email), r.telefone,
      NULL,
      left(r.mensagem, 4000),
      r.assunto,
      r.atendente_id, r.atendente_nome,
      NULLIF(r.ip, '')::inet, r.user_agent,
      COALESCE(r.last_reply_at, r.created_at),
      CASE WHEN r.last_reply_at IS NOT NULL THEN 'atendente'::public.chamado_autor_tipo
           ELSE 'visitante'::public.chamado_autor_tipo END,
      r.created_at, COALESCE(r.updated_at, r.created_at), r.last_reply_at
    ) RETURNING id INTO new_id;

    UPDATE public.contato_mensagens SET chamado_id = new_id WHERE id = r.id;

    -- Mensagem inicial (visitante)
    INSERT INTO public.chamado_mensagens (chamado_id, autor_tipo, autor_nome, conteudo, created_at)
    VALUES (new_id, 'visitante'::public.chamado_autor_tipo, r.nome, left(r.mensagem, 4000), r.created_at);

    -- Respostas viram mensagens de atendente
    INSERT INTO public.chamado_mensagens (chamado_id, autor_tipo, autor_id, autor_nome, conteudo, created_at)
    SELECT new_id, 'atendente'::public.chamado_autor_tipo, cr.autor_id, cr.autor_nome,
           left(cr.conteudo, 4000), cr.created_at
    FROM public.contato_respostas cr
    WHERE cr.mensagem_id = r.id
    ORDER BY cr.created_at;
  END LOOP;
END $$;

ALTER TABLE public.chamados ENABLE TRIGGER trg_chamados_audit;
ALTER TABLE public.chamado_mensagens ENABLE TRIGGER trg_chamado_msg_after_insert;
ALTER TABLE public.chamado_mensagens ENABLE TRIGGER trg_chamado_msg_first_response;
