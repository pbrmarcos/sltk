-- Auditoria: autor confiável + cobertura de OC e papéis
-- 1) Resolvedor de autor único, usado por todos os gatilhos.
--    Ordem: auth.uid() -> claim sub do JWT -> header x-audit-actor (escritas com service role)
--    -> GUC app.audit_user_id (scripts/manutenção).
create or replace function public.audit_actor()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare v text;
begin
  if auth.uid() is not null then return auth.uid(); end if;

  begin
    v := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
    if v is not null and v <> '' then return v::uuid; end if;
  exception when others then null; end;

  begin
    v := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-audit-actor';
    if v is not null and v <> '' then return v::uuid; end if;
  exception when others then null; end;

  begin
    v := nullif(current_setting('app.audit_user_id', true), '');
    if v is not null then return v::uuid; end if;
  exception when others then null; end;

  return null;
end $$;

grant execute on function public.audit_actor() to authenticated, service_role, anon;

-- 2) Gatilhos existentes: troca segura de auth.uid() por public.audit_actor()
do $do$
declare
  fn text;
  def text;
begin
  foreach fn in array array[
    'tg_chamados_audit','tg_chamado_msg_after_insert','tg_oportunidades_audit',
    'tg_role_module_permissions_audit','tg_fat_audit','tg_sat_relatorio_audit','tg_processos_audit'
  ] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fn
     limit 1;
    if def is null then continue; end if;
    def := replace(def, 'auth.uid()', 'public.audit_actor()');
    def := regexp_replace(def, 'CREATE OR REPLACE FUNCTION', 'CREATE OR REPLACE FUNCTION');
    execute def;
  end loop;
end $do$;

-- 3) Nova cobertura: ordens de compra (aprovação, cancelamento, alteração pós-aprovação)
create or replace function public.tg_ordens_compra_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  col text;
  actor uuid := public.audit_actor();
  cols text[] := array['status','aprovado_por','aprovado_em','fornecedor_id','valor_total','numero','condicao_pagamento','prazo_entrega'];
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, table_name, record_id, action, new_value)
    values (actor, 'ordens_compra', new.id::text, 'INSERT', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    foreach col in array cols loop
      if to_jsonb(new) ? col and to_jsonb(new)->col is distinct from to_jsonb(old)->col then
        insert into public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        values (actor, 'ordens_compra', new.id::text, 'UPDATE', col, to_jsonb(old)->col, to_jsonb(new)->col);
      end if;
    end loop;
    -- alteração de itens/valores depois de aprovada é evento sensível
    if old.aprovado_em is not null
       and new.valor_total is distinct from old.valor_total then
      insert into public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
      values (actor, 'ordens_compra', new.id::text, 'UPDATE', 'valor_total_pos_aprovacao',
              to_jsonb(old.valor_total), to_jsonb(new.valor_total));
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (user_id, table_name, record_id, action, old_value)
    values (actor, 'ordens_compra', old.id::text, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end $$;

drop trigger if exists tg_ordens_compra_audit on public.ordens_compra;
create trigger tg_ordens_compra_audit
  after insert or update or delete on public.ordens_compra
  for each row execute function public.tg_ordens_compra_audit();

-- 4) Nova cobertura: vínculo usuário × papel
create or replace function public.tg_user_roles_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor uuid := public.audit_actor();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, table_name, record_id, action, new_value)
    values (actor, 'user_roles', new.id::text, 'INSERT', to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (user_id, table_name, record_id, action, old_value)
    values (actor, 'user_roles', old.id::text, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end $$;

drop trigger if exists tg_user_roles_audit on public.user_roles;
create trigger tg_user_roles_audit
  after insert or delete on public.user_roles
  for each row execute function public.tg_user_roles_audit();
