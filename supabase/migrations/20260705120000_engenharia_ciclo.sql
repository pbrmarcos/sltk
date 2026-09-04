-- Ciclo unificado de Engenharia (Mecânico + Elétrico paralelos)
-- Estende equipamento_projetos com fase, progresso e vínculos de liberação.

-- 1) Enum de fase do ciclo
do $$
begin
  if not exists (select 1 from pg_type where typname = 'projeto_fase') then
    create type public.projeto_fase as enum ('briefing','analise','entregaveis','liberacao');
  end if;
end $$;

-- 2) Novas colunas em equipamento_projetos
alter table public.equipamento_projetos
  add column if not exists fase public.projeto_fase not null default 'briefing',
  add column if not exists progresso int not null default 0 check (progresso between 0 and 100),
  add column if not exists briefing_snapshot jsonb,
  add column if not exists pacote_revisao_id uuid references public.equipamento_revisoes(id) on delete set null,
  add column if not exists montagem_id uuid references public.equipamento_montagens(id) on delete set null;

create index if not exists idx_eqp_projetos_fase on public.equipamento_projetos(fase) where deleted_at is null;
create index if not exists idx_eqp_projetos_equipamento_disc on public.equipamento_projetos(equipamento_id, disciplina) where deleted_at is null;

-- 3) Trigger de liberação: preenche pacote + montagem + avança processo
create or replace function public.tg_projeto_liberacao_ciclo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev_id uuid;
  v_mont_id uuid;
  v_next_num int;
  v_rev_disc public.revisao_disciplina;
begin
  if new.status = 'liberado_producao'
     and (old.status is null or old.status <> 'liberado_producao') then

    new.fase := 'liberacao';
    new.progresso := 100;
    new.liberado_em := coalesce(new.liberado_em, now());
    new.liberado_por := coalesce(new.liberado_por, auth.uid());

    -- Cria snapshot de revisão de qualidade (se ainda não houver)
    if new.pacote_revisao_id is null then
      v_rev_disc := case new.disciplina
        when 'mecanico' then 'mecanica'::public.revisao_disciplina
        when 'eletrico' then 'eletrica'::public.revisao_disciplina
      end;
      select coalesce(max(numero),0)+1 into v_next_num
        from public.equipamento_revisoes
       where equipamento_id = new.equipamento_id and disciplina = v_rev_disc;

      insert into public.equipamento_revisoes
        (equipamento_id, cliente_id, disciplina, numero, projeto_id, status, observacoes, created_by)
      values
        (new.equipamento_id, new.cliente_id, v_rev_disc, v_next_num, new.id,
         'pendente'::public.revisao_status,
         'Pacote técnico congelado na liberação — revisão ' || new.revisao,
         auth.uid())
      returning id into v_rev_id;

      new.pacote_revisao_id := v_rev_id;
    end if;

    -- Cria ordem de montagem se ambas as disciplinas do equipamento estão liberadas
    -- e ainda não há montagem ativa
    if new.montagem_id is null then
      -- procurar montagem já criada pela outra disciplina
      select montagem_id into v_mont_id
        from public.equipamento_projetos
       where equipamento_id = new.equipamento_id
         and id <> new.id
         and montagem_id is not null
         and deleted_at is null
       limit 1;

      if v_mont_id is null then
        insert into public.equipamento_montagens
          (equipamento_id, cliente_id, status, progresso,
           inicio_previsto, fim_previsto, observacoes, created_by)
        values
          (new.equipamento_id, new.cliente_id,
           'nao_iniciada'::public.montagem_status, 0,
           (current_date + 3)::date,
           (current_date + 45)::date,
           'Ordem de montagem gerada automaticamente ao liberar projeto ' || new.revisao || ' (' || new.disciplina::text || ').',
           auth.uid())
        returning id into v_mont_id;
      end if;
      new.montagem_id := v_mont_id;
    end if;

    -- (BOM permanece com o status atual; consumo/reserva é tratado no fluxo de compras)
  end if;

  return new;
end $$;

drop trigger if exists tg_projeto_liberacao_ciclo on public.equipamento_projetos;
create trigger tg_projeto_liberacao_ciclo
  before update on public.equipamento_projetos
  for each row execute function public.tg_projeto_liberacao_ciclo();

-- 4) Grants (equipamento_projetos já concede — reforçando as tabelas destino)
grant select, insert, update on public.equipamento_revisoes to authenticated;
grant select, insert, update on public.equipamento_montagens to authenticated;
grant all on public.equipamento_revisoes to service_role;
grant all on public.equipamento_montagens to service_role;

-- 5) Função helper: cria ciclo a partir de oportunidade ganha
create or replace function public.criar_ciclo_engenharia(
  _equipamento_id uuid,
  _oportunidade_id uuid default null,
  _processo_id uuid default null,
  _briefing jsonb default '{}'::jsonb,
  _responsavel_mec uuid default null,
  _responsavel_elet uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
  v_disc public.projeto_disciplina;
begin
  select cliente_id into v_cliente
    from public.cliente_equipamentos
   where id = _equipamento_id and deleted_at is null;
  if v_cliente is null then
    raise exception 'Equipamento não encontrado';
  end if;

  foreach v_disc in array array['mecanico','eletrico']::public.projeto_disciplina[]
  loop
    if not exists (
      select 1 from public.equipamento_projetos
       where equipamento_id = _equipamento_id
         and disciplina = v_disc
         and deleted_at is null
    ) then
      insert into public.equipamento_projetos
        (equipamento_id, cliente_id, disciplina, revisao, status, fase,
         oportunidade_id, processo_id, briefing_snapshot,
         responsavel_id, created_by)
      values
        (_equipamento_id, v_cliente, v_disc, 'R00',
         'em_elaboracao'::public.projeto_status,
         'briefing'::public.projeto_fase,
         _oportunidade_id, _processo_id, _briefing,
         case v_disc when 'mecanico' then _responsavel_mec else _responsavel_elet end,
         auth.uid());
    end if;
  end loop;

  return _equipamento_id;
end $$;

grant execute on function public.criar_ciclo_engenharia(uuid,uuid,uuid,jsonb,uuid,uuid) to authenticated;
