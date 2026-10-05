-- Versiona funções e triggers que existiam SÓ no banco de produção (vieram do
-- snapshot de bootstrap, nunca estiveram em migration). Sem isso, um banco
-- novo criado a partir do repositório sobe sem: RPCs públicas da entrevista,
-- funções de admin de usuários, totais/repasse de OC, auditoria de ETP e
-- automações de insumos. Exportado com pg_get_functiondef/pg_get_triggerdef;
-- no banco atual é no-op (CREATE OR REPLACE + recriação idêntica dos triggers).

CREATE OR REPLACE FUNCTION public.admin_finalize_new_user(_user_id uuid, _email text, _full_name text, _roles app_role[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF _user_id IS NULL OR NULLIF(btrim(_email), '') IS NULL OR NULLIF(btrim(_full_name), '') IS NULL THEN
    RAISE EXCEPTION 'Dados do usuário inválidos.' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(array_length(_roles, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos uma role.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Perfil do novo usuário ainda não foi criado.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
     SET email = lower(btrim(_email)), full_name = btrim(_full_name),
         deleted_at = NULL, disabled = false, disabled_at = NULL,
         disabled_by = NULL, disabled_reason = NULL, updated_at = now()
   WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  SELECT _user_id, selected_role FROM unnest(_roles) AS selected_role
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Usuário criado por um admin já entra confirmado (sem depender de e-mail de confirmação)
  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
         confirmation_token = '',
         updated_at = now()
   WHERE id = _user_id AND email_confirmed_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_password(_user_id uuid, _password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
declare
  _actor uuid := auth.uid();
begin
  if _actor is null then
    raise exception 'Não autenticado.';
  end if;
  if not exists (select 1 from public.user_roles where user_id = _actor and role = 'admin'::app_role) then
    raise exception 'Acesso restrito a administradores.';
  end if;
  if _actor = _user_id then
    raise exception 'Use a página de conta para alterar sua própria senha.';
  end if;
  if public.max_role_rank(_user_id) > public.max_role_rank(_actor) then
    raise exception 'Você não pode alterar a senha de um usuário com privilégio superior.';
  end if;
  if _password is null or length(_password) < 12 then
    raise exception 'Senha deve ter ao menos 12 caracteres.';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = _user_id;

  if not found then
    raise exception 'Usuário não encontrado.';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_entrevista(_codigo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  clean text := upper(trim(coalesce(_codigo, '')));
  ent record;
  seg jsonb;
  perguntas jsonb;
  brand jsonb;
BEGIN
  IF length(clean) < 4 OR length(clean) > 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  SELECT id, codigo, segmento_id, idioma_default, status, expires_at, lead_nome
    INTO ent
    FROM public.entrevistas
   WHERE codigo = clean
     AND deleted_at IS NULL
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF ent.status <> 'pendente' THEN
    RETURN jsonb_build_object('ok', false, 'error', ent.status);
  END IF;

  IF ent.expires_at IS NOT NULL AND ent.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  SELECT jsonb_build_object(
           'id', s.id,
           'slug', s.slug,
           'nome_pt', s.nome_pt,
           'nome_es', s.nome_es,
           'nome_en', s.nome_en
         )
    INTO seg
    FROM public.entrevista_segmentos s
   WHERE s.id = ent.segmento_id;

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'id', p.id,
             'numero', p.numero,
             'ordem', p.ordem,
             'formato', p.formato,
             'enunciado_pt', p.enunciado_pt,
             'enunciado_es', p.enunciado_es,
             'enunciado_en', p.enunciado_en,
             'obrigatoria', p.obrigatoria,
             'opcoes', coalesce((
               SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', o.id,
                          'pergunta_id', o.pergunta_id,
                          'ordem', o.ordem,
                          'label_pt', o.label_pt,
                          'label_es', o.label_es,
                          'label_en', o.label_en,
                          'tem_descricao', o.tem_descricao
                        ) ORDER BY o.ordem
                      )
                 FROM public.entrevista_opcoes o
                WHERE o.pergunta_id = p.id
             ), '[]'::jsonb)
           ) ORDER BY p.ordem
         ), '[]'::jsonb)
    INTO perguntas
    FROM public.entrevista_perguntas p
   WHERE p.segmento_id = ent.segmento_id;

  SELECT jsonb_build_object(
           'logo', coalesce(b.logo_url_dark, b.logo_url),
           'logo_collapsed', coalesce(b.logo_url_collapsed_dark, b.logo_url_collapsed),
           'nome', 'SLTK Americas'
         )
    INTO brand
    FROM public.brand_settings b
   LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'entrevista', jsonb_build_object(
      'id', ent.id,
      'codigo', ent.codigo,
      'idioma_default', ent.idioma_default,
      'lead_nome', ent.lead_nome
    ),
    'segmento', seg,
    'perguntas', perguntas,
    'brand', coalesce(brand, jsonb_build_object('logo', null, 'logo_collapsed', null, 'nome', 'SLTK Americas'))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.oc_itens_after_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_oc uuid;
BEGIN
  v_oc := COALESCE(NEW.ordem_compra_id, OLD.ordem_compra_id);
  PERFORM public.oc_recalc_totais(v_oc);
  PERFORM public.oc_recalc_repasse(v_oc);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.oc_recalc_repasse(oc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_repasse numeric(14,2);
  v_total numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(valor_repasse_total_item),0)
    INTO v_repasse
    FROM public.ordem_compra_itens
   WHERE ordem_compra_id = oc_id;

  SELECT valor_total INTO v_total FROM public.ordens_compra WHERE id = oc_id;

  UPDATE public.ordens_compra
     SET valor_repasse_total = v_repasse,
         valor_repasse = v_repasse,
         margem_bruta = v_repasse - COALESCE(v_total,0)
   WHERE id = oc_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.oc_recalc_totais(oc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub numeric := 0; v_desc numeric := 0; v_ipi numeric := 0;
  v_st numeric := 0; v_frete numeric := 0;
BEGIN
  SELECT COALESCE(SUM(quantidade * valor_unitario),0),
         COALESCE(SUM(valor_desconto),0),
         COALESCE(SUM(valor_ipi),0),
         COALESCE(SUM(valor_icms_st),0)
    INTO v_sub, v_desc, v_ipi, v_st
  FROM public.ordem_compra_itens WHERE ordem_compra_id = oc_id;
  SELECT COALESCE(valor_frete,0) INTO v_frete FROM public.ordens_compra WHERE id = oc_id;
  UPDATE public.ordens_compra
     SET valor_subtotal = v_sub, valor_desconto = v_desc, valor_ipi = v_ipi,
         valor_icms_st = v_st,
         valor_total = (v_sub - v_desc + v_ipi + v_st + v_frete),
         updated_at = now()
   WHERE id = oc_id;
END $function$;

CREATE OR REPLACE FUNCTION public.oc_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END $function$;

CREATE OR REPLACE FUNCTION public.submit_public_entrevista(_codigo text, _idioma text DEFAULT 'pt'::text, _contato jsonb DEFAULT '{}'::jsonb, _respostas jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  clean text := upper(trim(coalesce(_codigo, '')));
  ent record;
  respostas_json jsonb := coalesce(_respostas, '[]'::jsonb);
  contato_json jsonb := coalesce(_contato, '{}'::jsonb);
BEGIN
  IF length(clean) < 4 OR length(clean) > 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF jsonb_typeof(respostas_json) <> 'array' OR jsonb_array_length(respostas_json) > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  SELECT id, codigo, segmento_id, criado_por, status, expires_at, lead_nome
    INTO ent
    FROM public.entrevistas
   WHERE codigo = clean
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF ent.status = 'respondida' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true);
  END IF;

  IF ent.status <> 'pendente' THEN
    RETURN jsonb_build_object('ok', false, 'error', ent.status);
  END IF;

  IF ent.expires_at IS NOT NULL AND ent.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  WITH raw AS (
    SELECT *
      FROM jsonb_to_recordset(respostas_json)
        AS x(pergunta_id text, valor_text text, valor_options jsonb, descricao_extra text)
  ), valid AS (
    SELECT *
      FROM raw
     WHERE pergunta_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  INSERT INTO public.entrevista_respostas (entrevista_id, pergunta_id, valor_text, valor_options, descricao_extra)
  SELECT ent.id,
         v.pergunta_id::uuid,
         nullif(left(coalesce(v.valor_text, ''), 4000), ''),
         CASE WHEN v.valor_options IS NOT NULL AND jsonb_typeof(v.valor_options) = 'array' THEN v.valor_options ELSE NULL END,
         nullif(left(coalesce(v.descricao_extra, ''), 2000), '')
    FROM valid v
    JOIN public.entrevista_perguntas p
      ON p.id = v.pergunta_id::uuid
     AND p.segmento_id = ent.segmento_id
  ON CONFLICT (entrevista_id, pergunta_id) DO UPDATE SET
    valor_text = EXCLUDED.valor_text,
    valor_options = EXCLUDED.valor_options,
    descricao_extra = EXCLUDED.descricao_extra;

  UPDATE public.entrevistas
     SET status = 'respondida',
         respondida_em = now(),
         updated_at = now(),
         contato_nome = nullif(left(coalesce(contato_json->>'nome', ''), 200), ''),
         contato_email = nullif(left(coalesce(contato_json->>'email', ''), 200), ''),
         contato_whatsapp = nullif(left(coalesce(contato_json->>'whatsapp', ''), 80), ''),
         contato_cargo = nullif(left(coalesce(contato_json->>'cargo', ''), 120), '')
   WHERE id = ent.id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_equipamento_etps_audit_historico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_nome text;
  v_old text;
  v_new text;
  v_campos text[] := array['escopo','premissas','requisitos_funcionais','requisitos_tecnicos','criterios_aceite','riscos','observacoes'];
  v_campo text;
begin
  select coalesce(full_name, email, 'Sistema') into v_nome
    from public.profiles where id = v_uid;
  v_nome := coalesce(v_nome, 'Sistema');

  if tg_op = 'INSERT' then
    insert into public.equipamento_etp_historico (etp_id, tipo, mensagem, created_by, created_by_nome)
    values (new.id, 'status', 'ETP criado (v' || new.versao || ', ' || new.status || ').', v_uid, v_nome);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.equipamento_etp_historico (etp_id, tipo, campo, valor_anterior, valor_novo, created_by, created_by_nome)
      values (new.id,
        case when new.status = 'aprovado' then 'aprovacao'::public.etp_historico_tipo else 'status'::public.etp_historico_tipo end,
        'status', old.status::text, new.status::text, v_uid, v_nome);
    end if;
    foreach v_campo in array v_campos loop
      execute format('select ($1).%I::text, ($2).%I::text', v_campo, v_campo) into v_old, v_new using old, new;
      if v_old is distinct from v_new then
        insert into public.equipamento_etp_historico (etp_id, tipo, campo, valor_anterior, valor_novo, created_by, created_by_nome)
        values (new.id, 'alteracao', v_campo, left(coalesce(v_old, ''), 600), left(coalesce(v_new, ''), 600), v_uid, v_nome);
      end if;
    end loop;
  end if;

  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.tg_etp_anexos_audit_historico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_nome text;
begin
  select coalesce(full_name, email, 'Sistema') into v_nome from public.profiles where id = v_uid;
  v_nome := coalesce(v_nome, 'Sistema');

  if tg_op = 'INSERT' then
    insert into public.equipamento_etp_historico (etp_id, tipo, campo, valor_novo, mensagem, created_by, created_by_nome)
    values (new.etp_id, 'anexo', 'anexo_adicionado', left(new.nome_final, 600),
            coalesce(new.descricao, ''), v_uid, v_nome);
  elsif tg_op = 'UPDATE' then
    if (old.deleted_at is null) and (new.deleted_at is not null) then
      insert into public.equipamento_etp_historico (etp_id, tipo, campo, valor_anterior, mensagem, created_by, created_by_nome)
      values (new.etp_id, 'anexo', 'anexo_removido', left(new.nome_final, 600),
              'Anexo enviado para a lixeira do Drive.', v_uid, v_nome);
    end if;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.tg_insumo_atividade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_nome text;
  v_diff jsonb;
begin
  select coalesce(p.full_name, p.email, 'Sistema') into v_nome
    from public.profiles p where p.id = v_actor;

  if (tg_op = 'INSERT') then
    insert into public.insumo_atividades(insumo_id, tipo, descricao, meta, actor_id, actor_nome)
    values (new.id, 'criado', coalesce(new.descricao,'(sem descrição)'), jsonb_build_object('status', new.status), v_actor, v_nome);
    return new;
  elsif (tg_op = 'UPDATE') then
    if new.status is distinct from old.status then
      insert into public.insumo_atividades(insumo_id, tipo, descricao, meta, actor_id, actor_nome)
      values (new.id, 'status_alterado',
              format('Status %s → %s', old.status, new.status),
              jsonb_build_object('de', old.status, 'para', new.status),
              v_actor, v_nome);
    end if;
    v_diff := jsonb_strip_nulls(jsonb_build_object(
      'descricao',       case when new.descricao is distinct from old.descricao then jsonb_build_array(old.descricao, new.descricao) end,
      'quantidade',      case when new.quantidade is distinct from old.quantidade then jsonb_build_array(old.quantidade, new.quantidade) end,
      'unidade',         case when new.unidade is distinct from old.unidade then jsonb_build_array(old.unidade, new.unidade) end,
      'fabricante',      case when new.fabricante_sugerido is distinct from old.fabricante_sugerido then jsonb_build_array(old.fabricante_sugerido, new.fabricante_sugerido) end,
      'part_number',     case when new.part_number is distinct from old.part_number then jsonb_build_array(old.part_number, new.part_number) end,
      'codigo_interno',  case when new.codigo_interno is distinct from old.codigo_interno then jsonb_build_array(old.codigo_interno, new.codigo_interno) end,
      'criticidade',     case when new.criticidade is distinct from old.criticidade then jsonb_build_array(old.criticidade, new.criticidade) end,
      'lead_time',       case when new.lead_time_desejado_dias is distinct from old.lead_time_desejado_dias then jsonb_build_array(old.lead_time_desejado_dias, new.lead_time_desejado_dias) end,
      'necessidade_em',  case when new.necessidade_em is distinct from old.necessidade_em then jsonb_build_array(old.necessidade_em, new.necessidade_em) end,
      'observacoes',     case when new.observacoes is distinct from old.observacoes then jsonb_build_array(old.observacoes, new.observacoes) end,
      'especificacao',   case when new.especificacao_tecnica is distinct from old.especificacao_tecnica then jsonb_build_array(old.especificacao_tecnica, new.especificacao_tecnica) end
    ));
    if v_diff <> '{}'::jsonb then
      insert into public.insumo_atividades(insumo_id, tipo, descricao, meta, actor_id, actor_nome)
      values (new.id, 'editado', 'Insumo editado', v_diff, v_actor, v_nome);
    end if;
    return new;
  end if;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.tg_insumo_rfq_envio_atualizar_respondido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.kind = 'orcamento' AND NEW.fornecedor_id IS NOT NULL THEN
    UPDATE public.insumo_rfq_envios
    SET status = 'respondido',
        data_resposta = COALESCE(data_resposta, now()),
        updated_at = now()
    WHERE insumo_id = NEW.insumo_id
      AND fornecedor_id = NEW.fornecedor_id
      AND status = 'enviado';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_insumo_rfq_envio_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_projeto_insumos_set_opp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.oportunidade_id IS NULL AND NEW.projeto_id IS NOT NULL THEN
    SELECT ep.oportunidade_id INTO NEW.oportunidade_id
      FROM public.equipamento_projetos ep WHERE ep.id = NEW.projeto_id;
  END IF;
  RETURN NEW;
END $function$;

-- ============ Triggers ============
DROP TRIGGER IF EXISTS equipamento_etps_audit_historico ON public.equipamento_etps;
CREATE TRIGGER equipamento_etps_audit_historico AFTER INSERT OR UPDATE ON public.equipamento_etps FOR EACH ROW EXECUTE FUNCTION tg_equipamento_etps_audit_historico();

DROP TRIGGER IF EXISTS tg_equipamento_etp_anexos_audit ON public.equipamento_etp_anexos;
CREATE TRIGGER tg_equipamento_etp_anexos_audit AFTER INSERT OR UPDATE ON public.equipamento_etp_anexos FOR EACH ROW EXECUTE FUNCTION tg_etp_anexos_audit_historico();

DROP TRIGGER IF EXISTS tg_projeto_insumos_set_opp_biu ON public.projeto_insumos;
CREATE TRIGGER tg_projeto_insumos_set_opp_biu BEFORE INSERT OR UPDATE OF projeto_id ON public.projeto_insumos FOR EACH ROW EXECUTE FUNCTION tg_projeto_insumos_set_opp();

DROP TRIGGER IF EXISTS trg_insumo_atividade ON public.projeto_insumos;
CREATE TRIGGER trg_insumo_atividade AFTER INSERT OR UPDATE ON public.projeto_insumos FOR EACH ROW EXECUTE FUNCTION tg_insumo_atividade();

DROP TRIGGER IF EXISTS trg_insumo_rfq_envio_atualizar_respondido ON public.insumo_anexos;
CREATE TRIGGER trg_insumo_rfq_envio_atualizar_respondido AFTER INSERT ON public.insumo_anexos FOR EACH ROW EXECUTE FUNCTION tg_insumo_rfq_envio_atualizar_respondido();

DROP TRIGGER IF EXISTS trg_oc_itens_recalc ON public.ordem_compra_itens;
CREATE TRIGGER trg_oc_itens_recalc AFTER INSERT OR DELETE OR UPDATE ON public.ordem_compra_itens FOR EACH ROW EXECUTE FUNCTION oc_itens_after_change();

DROP TRIGGER IF EXISTS trg_oc_updated ON public.ordens_compra;
CREATE TRIGGER trg_oc_updated BEFORE UPDATE ON public.ordens_compra FOR EACH ROW EXECUTE FUNCTION oc_set_updated_at();

-- ============ Permissões ============
-- Funções de admin checam o papel internamente, mas não precisam ser
-- chamáveis sem login: defesa em profundidade.
REVOKE ALL ON FUNCTION public.admin_finalize_new_user(uuid, text, text, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_finalize_new_user(uuid, text, text, public.app_role[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_user_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid, text) TO authenticated, service_role;
-- RPCs públicas da entrevista: o formulário é acessado sem login.
GRANT EXECUTE ON FUNCTION public.get_public_entrevista(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_public_entrevista(text, text, jsonb, jsonb) TO anon, authenticated, service_role;
