-- Uso: rodar como postgres (SQL editor do Supabase ou Management API). O
-- relatório volta como mensagem de erro — é proposital: o RAISE final desfaz
-- tudo (usuários temporários e gravações de teste). Ver ok/ERRO por papel.
-- Varredura de permissões por papel. Cria um usuário temporário por papel,
-- roda operações reais de cada módulo como ele e, no fim, aborta a transação
-- inteira (RAISE) devolvendo o relatório na mensagem de erro. Nada persiste.
do $$
declare
  papeis text[] := array['admin','manager','sales','engineer','production','purchasing','assembly','field'];
  ops text[][] := array[
    ['ver_clientes',      'select count(*) from public.clientes'],
    ['ver_oportunidades', 'select count(*) from public.oportunidades'],
    ['ver_processos',     'select count(*) from public.processos'],
    ['ver_fornecedores',  'select count(*) from public.fornecedores'],
    ['ver_chamados',      'select count(*) from public.chamados'],
    ['ver_documentos',    'select count(*) from public.documentos'],
    ['ver_almox',         'select count(*) from public.almox_itens'],
    ['opp_criar_e_mover', 'with n as (insert into public.oportunidades(titulo, responsavel_id, created_by) values (''t'', auth.uid(), auth.uid()) returning id) update public.oportunidades set pipeline_stage = ''qualificado'' where id = (select id from n)'],
    ['opp_nota',          'insert into public.oportunidade_notas(oportunidade_id, user_id, texto) select id, auth.uid(), ''x'' from public.oportunidades where responsavel_id = auth.uid() or public.has_role(auth.uid(), ''admin'') limit 1'],
    ['cli_criar',         'insert into public.clientes(codigo, razao_social, pais, documento_fiscal_tipo, documento_fiscal_numero, moeda, idioma, created_by) values ('''', ''T RLS'', ''BR'', ''CNPJ'', ''SUSPECT-'' || substr(md5(random()::text),1,8), ''USD'', ''pt'', auth.uid()) returning id'],
    ['cli_editar',        'update public.clientes set observacoes = observacoes where id = (select id from public.clientes where deleted_at is null order by created_at limit 1)'],
    ['equip_criar',       'insert into public.cliente_equipamentos(cliente_id, modelo) select id, ''t'' from public.clientes where deleted_at is null order by created_at limit 1'],
    ['forn_criar',        'insert into public.fornecedores(codigo, nome) values ('''', ''T RLS'')'],
    ['cotacao_criar',     'insert into public.cotacoes(titulo) values (''T RLS'')'],
    ['almox_criar',       'insert into public.almox_itens(codigo, descricao, unidade_estoque) values (''T'' || substr(md5(random()::text),1,6), ''t'', ''UN'')'],
    ['processo_editar',   'update public.processos set titulo = titulo where id = (select id from public.processos where deleted_at is null limit 1)'],
    ['tarefa_criar',      'insert into public.processo_tarefas(processo_id, titulo, pilar_id, prazo) select id, ''t'', auth.uid(), now() from public.processos where deleted_at is null limit 1'],
    ['fat_editar',        'update public.fat_relatorios set updated_at = updated_at where id = (select id from public.fat_relatorios limit 1)'],
    ['sat_editar',        'update public.sat_relatorio set updated_at = updated_at where id = (select id from public.sat_relatorio limit 1)'],
    ['chamado_editar',    'update public.chamados set updated_at = updated_at where id = (select id from public.chamados limit 1)']
  ];
  r text; i int; uid uuid; n bigint; linha text; relatorio text := '';
begin
  foreach r in array papeis loop
    uid := gen_random_uuid();
    insert into auth.users(id, email, aud, role, instance_id, created_at, updated_at)
      values (uid, r || '-rls@teste.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now(), now());
    insert into public.user_roles(user_id, role) values (uid, r::app_role) on conflict do nothing;
    linha := rpad(r, 11);
    for i in 1 .. array_length(ops, 1) loop
      begin
        perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
        if ops[i][1] like 'ver_%' then
          execute ops[i][2] into n;
          raise exception using errcode = 'P0001', message = 'OK:' || n;
        else
          execute ops[i][2];
          get diagnostics n = row_count;
          raise exception using errcode = 'P0001', message = 'OK:' || n;
        end if;
      exception when others then
        linha := linha || ' ' || ops[i][1] || '=' ||
          case when sqlerrm like 'OK:%' then substr(sqlerrm, 1, 12) else 'ERRO[' || sqlstate || ' ' || left(sqlerrm, 70) || ']' end;
      end;
    end loop;
    relatorio := relatorio || linha || E'\n';
  end loop;
  raise exception 'RELATORIO%', E'\n' || relatorio;
end $$;
