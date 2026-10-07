-- Varredura de permissões por papel (criar/editar em cada módulo).
--
-- Uso: rodar como postgres (SQL editor do Supabase ou Management API). O
-- relatório volta como mensagem de erro — é proposital: o RAISE final desfaz
-- tudo (registros de apoio, usuários temporários e gravações de teste).
--
-- Como funciona:
--   1. Cria registros de apoio (cliente, equipamento, projeto, montagem,
--      fornecedor, chamado, processo, FAT, embarque) como postgres — não
--      depende de haver dados no banco.
--   2. Para cada papel cria um usuário temporário, com uma oportunidade, um
--      processo e um SAT "dele" (o vendedor só mexe no que é seu).
--   3. Roda cada operação como esse usuário (RLS de verdade) e compara com a
--      matriz role_module_permissions:
--        FALTA = o módulo está liberado mas o banco recusou  → corrigir
--        SOBRA = o módulo não está liberado mas o banco deixou (informativo)
--   Operações de update que não atingem nenhuma linha contam como recusa.
do $$
declare
  papeis text[] := array['admin','manager','sales','engineer','production','purchasing','assembly','field'];
  -- {nome, módulo(s) que deveriam liberar (separados por |), SQL}
  ops text[][] := array[
    ['cli_criar',        'clientes',  $q$insert into public.clientes(codigo, razao_social, pais, documento_fiscal_tipo, documento_fiscal_numero, moeda, idioma, created_by) values ('', 'T RLS', 'BR', 'CNPJ', 'SUSPECT-' || {rnd}, 'USD', 'pt', auth.uid()) returning id$q$],
    ['cli_editar',       'clientes',  $q$update public.clientes set observacoes = 'x' where id = {cli}$q$],
    ['cli_arquivar',     'clientes',  $q$update public.clientes set deleted_at = now() where id = {cli}$q$],
    ['opp_arquivar',     'comercial', $q$update public.oportunidades set deleted_at = now() where id = {opp}$q$],
    ['contato_criar',    'clientes',  $q$insert into public.cliente_contatos(cliente_id, nome) values ({cli}, 't') returning id$q$],
    ['segmento_criar',   'clientes|comercial', $q$insert into public.segmentos(nome) values ('T ' || {rnd}) returning id$q$],
    ['opp_criar',        'comercial', $q$insert into public.oportunidades(titulo, responsavel_id, created_by, cliente_id) values ('t', auth.uid(), auth.uid(), {cli}) returning id$q$],
    ['opp_mover',        'comercial', $q$update public.oportunidades set pipeline_stage = 'qualificado' where id = {opp}$q$],
    ['opp_nota',         'comercial', $q$insert into public.oportunidade_notas(oportunidade_id, user_id, texto) values ({opp}, auth.uid(), 'x') returning id$q$],
    ['orcamento_criar',  'comercial', $q$insert into public.documentos(codigo, tipo_codigo, cliente_id, oportunidade_id, titulo, status, created_by, responsavel_id) values ('T-' || {rnd}, 'orcamento', {cli}, {opp}, 't', 'rascunho', auth.uid(), auth.uid()) returning id$q$],
    ['entrevista_criar', 'comercial', $q$insert into public.entrevistas(codigo, segmento_id, criado_por) values ('T-' || {rnd}, {seg}, auth.uid()) returning id$q$],
    ['lead_origem_criar','comercial', $q$insert into public.lead_origens(nome) values ('T ' || {rnd}) returning id$q$],
    ['processo_criar',   'comercial', $q$insert into public.processos(codigo, titulo, cliente_id, pilar_id, created_by) values ('T-' || {rnd}, 't', {cli}, auth.uid(), auth.uid()) returning id$q$],
    ['tarefa_criar',     'comercial', $q$insert into public.processo_tarefas(processo_id, titulo, pilar_id, prazo) values ({proc_u}, 't', auth.uid(), now()) returning id$q$],
    ['equip_criar',      'engenharia', $q$insert into public.cliente_equipamentos(cliente_id, modelo) values ({cli}, 't') returning id$q$],
    ['projeto_criar',    'engenharia', $q$insert into public.equipamento_projetos(equipamento_id, cliente_id, disciplina, revisao) values ({eq}, {cli}, 'eletrico', 'R09') returning id$q$],
    ['projeto_editar',   'engenharia', $q$update public.equipamento_projetos set observacoes = 'x' where id = {proj}$q$],
    ['etp_criar',        'engenharia', $q$insert into public.equipamento_etps(equipamento_id, cliente_id) values ({eq}, {cli}) returning id$q$],
    ['revisao_criar',    'engenharia', $q$insert into public.equipamento_revisoes(equipamento_id, cliente_id, disciplina) values ({eq}, {cli}, 'mecanica') returning id$q$],
    ['etapa_criar',      'engenharia', $q$insert into public.equipamento_disciplina_etapas(equipamento_id, disciplina, titulo, created_by) values ({eq}, 'engenharia', 't', auth.uid()) returning id$q$],
    ['insumo_criar',     'engenharia', $q$insert into public.projeto_insumos(projeto_id, disciplina, descricao, quantidade) values ({proj}, 'mecanico', 't', 1) returning id$q$],
    ['montagem_criar',   'producao',  $q$insert into public.equipamento_montagens(equipamento_id, cliente_id) values ({eq}, {cli}) returning id$q$],
    ['montagem_etapa',   'producao',  $q$update public.equipamento_montagem_etapas set ordem = ordem where id = {met}$q$],
    ['fat_criar',        'qualidade', $q$insert into public.fat_relatorios(processo_id, cliente_id) values ({proc}, {cli}) returning id$q$],
    ['fat_editar',       'qualidade', $q$update public.fat_relatorios set updated_at = now() where id = {fat}$q$],
    ['sat_criar',        'qualidade|pos_vendas', $q$insert into public.sat_relatorio(codigo, template_id, template_versao, created_by, cliente_id) values ('T-' || {rnd}, {sat_tpl}, 1, auth.uid(), {cli}) returning id$q$],
    ['sat_editar',       'qualidade|pos_vendas', $q$update public.sat_relatorio set updated_at = now() where id = {sat_u}$q$],
    ['chamado_criar',    'pos_vendas', $q$insert into public.chamados(codigo, token_hash, visitante_nome, visitante_email, descricao_inicial, cliente_id) values ('T-' || {rnd}, {rnd}, 'v', 'v@x.com', 'teste rls', {cli}) returning id$q$],
    ['chamado_editar',   'pos_vendas', $q$update public.chamados set updated_at = now() where id = {cham}$q$],
    ['embarque_criar',   'logistica', $q$insert into public.logistica_embarques(projeto_id) values ({proj}) returning id$q$],
    ['embarque_editar',  'logistica', $q$update public.logistica_embarques set updated_at = now() where id = {emb}$q$],
    ['forn_criar',       'fornecedores', $q$insert into public.fornecedores(codigo, nome) values ('', 'T RLS') returning id$q$],
    ['forn_editar',      'fornecedores', $q$update public.fornecedores set nome = nome where id = {forn}$q$],
    ['forn_arquivar',    'fornecedores', $q$update public.fornecedores set deleted_at = now() where id = {forn}$q$],
    ['cotacao_criar',    'compras',   $q$insert into public.cotacoes(titulo) values ('T RLS') returning id$q$],
    ['oc_criar',         'compras',   $q$insert into public.ordens_compra(fornecedor_id) values ({forn}) returning id$q$],
    ['almox_criar',      'compras',   $q$insert into public.almox_itens(codigo, descricao, unidade_estoque) values ('T' || substr(md5(random()::text),1,6), 't', 'UN') returning id$q$]
  ];
  fx jsonb := '{}'::jsonb;
  outro uuid; v uuid; r text; i int; k text; uid uuid; n bigint; sqltxt text; esperado boolean; ok boolean; msg text;
  linha text; relatorio text := ''; faltas int := 0;
begin
  -- 1) registros de apoio
  select id into outro from public.profiles limit 1;
  insert into public.clientes(codigo, razao_social, pais, documento_fiscal_tipo, documento_fiscal_numero, moeda, idioma)
    values ('', 'Apoio RLS', 'BR', 'CNPJ', 'SUSPECT-apoio', 'USD', 'pt') returning id into v; fx := fx || jsonb_build_object('cli', v);
  insert into public.cliente_equipamentos(cliente_id, modelo) values ((fx->>'cli')::uuid, 'Apoio') returning id into v; fx := fx || jsonb_build_object('eq', v);
  insert into public.equipamento_projetos(equipamento_id, cliente_id, disciplina, revisao) values ((fx->>'eq')::uuid, (fx->>'cli')::uuid, 'mecanico', 'R00') returning id into v; fx := fx || jsonb_build_object('proj', v);
  insert into public.equipamento_montagens(equipamento_id, cliente_id) values ((fx->>'eq')::uuid, (fx->>'cli')::uuid) returning id into v; fx := fx || jsonb_build_object('mont', v);
  insert into public.equipamento_montagem_etapas(montagem_id, equipamento_id, cliente_id, tipo, ordem) values ((fx->>'mont')::uuid, (fx->>'eq')::uuid, (fx->>'cli')::uuid, 'mecanica', 1) returning id into v; fx := fx || jsonb_build_object('met', v);
  insert into public.fornecedores(codigo, nome) values ('', 'Apoio RLS') returning id into v; fx := fx || jsonb_build_object('forn', v);
  insert into public.chamados(codigo, token_hash, visitante_nome, visitante_email, descricao_inicial) values ('T-APOIO', 'x', 'v', 'v@x.com', 'apoio rls') returning id into v; fx := fx || jsonb_build_object('cham', v);
  insert into public.processos(codigo, titulo, cliente_id, pilar_id) values ('T-APOIO', 'apoio', (fx->>'cli')::uuid, outro) returning id into v; fx := fx || jsonb_build_object('proc', v);
  insert into public.fat_relatorios(processo_id, cliente_id) values ((fx->>'proc')::uuid, (fx->>'cli')::uuid) returning id into v; fx := fx || jsonb_build_object('fat', v);
  insert into public.logistica_embarques(projeto_id) values ((fx->>'proj')::uuid) returning id into v; fx := fx || jsonb_build_object('emb', v);
  select id into v from public.sat_template order by versao desc limit 1; fx := fx || jsonb_build_object('sat_tpl', v);
  select id into v from public.entrevista_segmentos limit 1; fx := fx || jsonb_build_object('seg', v);

  foreach r in array papeis loop
    -- 2) usuário temporário e o que é "dele"
    uid := gen_random_uuid();
    insert into auth.users(id, email, aud, role, instance_id, created_at, updated_at)
      values (uid, r || '-rls@teste.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now(), now());
    insert into public.profiles(id, email) values (uid, r || '-rls@teste.local') on conflict (id) do nothing;
    delete from public.user_roles where user_id = uid;
    insert into public.user_roles(user_id, role) values (uid, r::app_role);
    insert into public.oportunidades(titulo, responsavel_id, created_by, cliente_id) values ('dele', uid, uid, (fx->>'cli')::uuid) returning id into v; fx := fx || jsonb_build_object('opp', v);
    insert into public.processos(codigo, titulo, cliente_id, pilar_id, created_by) values ('T-' || r, 'dele', (fx->>'cli')::uuid, uid, uid) returning id into v; fx := fx || jsonb_build_object('proc_u', v);
    insert into public.sat_relatorio(codigo, template_id, template_versao, created_by, tecnico_ids, cliente_id) values ('T-' || r, (fx->>'sat_tpl')::uuid, 1, outro, array[uid], (fx->>'cli')::uuid) returning id into v; fx := fx || jsonb_build_object('sat_u', v);

    linha := '';
    for i in 1 .. array_length(ops, 1) loop
      sqltxt := ops[i][3];
      for k in select jsonb_object_keys(fx) loop
        sqltxt := replace(sqltxt, '{' || k || '}', quote_literal(fx->>k) || '::uuid');
      end loop;
      sqltxt := replace(sqltxt, '{rnd}', quote_literal(substr(md5(random()::text), 1, 8)));

      select r = 'admin' or exists (
        select 1 from public.role_module_permissions p
         where p.role = r::app_role and p.enabled and p.module::text = any(string_to_array(ops[i][2], '|'))
      ) into esperado;

      begin
        perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
        execute sqltxt;
        get diagnostics n = row_count;
        raise exception using errcode = 'P0001', message = case when n > 0 then 'OK' else 'NADA: nenhuma linha atingida' end;
      exception when others then
        ok := sqlerrm = 'OK';
        msg := case when ok then '' else sqlstate || ' ' || left(sqlerrm, 90) end;
      end;

      if esperado and not ok then
        linha := linha || E'\n    FALTA ' || ops[i][1] || ' → ' || msg;
        faltas := faltas + 1;
      elsif ok and not esperado then
        linha := linha || E'\n    sobra ' || ops[i][1];
      end if;
    end loop;
    relatorio := relatorio || E'\n' || r || coalesce(nullif(linha, ''), ' — tudo certo');
  end loop;

  raise exception 'RELATORIO (% faltas)%', faltas, relatorio;
end $$;
