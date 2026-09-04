-- Popula equipamento_etapas (Gantt) a partir das etapas por disciplina,
-- para equipamentos que ainda não possuem linhas no Gantt.
with base as (
  select
    d.id,
    d.equipamento_id,
    e.cliente_id,
    d.titulo,
    d.disciplina,
    d.status,
    d.progresso,
    row_number() over (partition by d.equipamento_id order by
      case d.disciplina
        when 'planejamento' then 1
        when 'engenharia' then 2
        when 'producao' then 3
        when 'qualidade' then 4
        when 'pos_venda' then 5
        else 6 end,
      d.ordem, d.created_at) as seq,
    coalesce(d.data_vencimento, (e.created_at::date + (d.ordem + 1) * 7)) as fim
  from public.equipamento_disciplina_etapas d
  join public.cliente_equipamentos e on e.id = d.equipamento_id
  where d.deleted_at is null
    and e.deleted_at is null
    and not exists (
      select 1 from public.equipamento_etapas x
      where x.equipamento_id = d.equipamento_id and x.deleted_at is null
    )
)
insert into public.equipamento_etapas (
  equipamento_id, cliente_id, ordem, nome, fase,
  data_inicio_prev, data_fim_prev, data_inicio_real, data_fim_real,
  hh_mecanica_estimada, hh_eletrica_estimada,
  hh_mecanica_real, hh_eletrica_real,
  progresso, status
)
select
  b.equipamento_id,
  b.cliente_id,
  b.seq,
  b.titulo,
  (case b.disciplina
     when 'planejamento' then 'engenharia'
     when 'engenharia' then 'engenharia'
     when 'producao' then 'montagem'
     when 'qualidade' then 'qualidade'
     when 'pos_venda' then 'expedicao'
     else 'engenharia' end)::etapa_fase,
  b.fim - 5,
  b.fim,
  case when b.status in ('concluido','em_progresso') then b.fim - 5 end,
  case when b.status = 'concluido' then b.fim end,
  case b.disciplina when 'engenharia' then 12 when 'producao' then 16 when 'planejamento' then 6 else 4 end,
  case b.disciplina when 'engenharia' then 10 when 'producao' then 8 when 'planejamento' then 4 else 3 end,
  round((case b.disciplina when 'engenharia' then 12 when 'producao' then 16 when 'planejamento' then 6 else 4 end) * coalesce(b.progresso,0) / 100.0, 1),
  round((case b.disciplina when 'engenharia' then 10 when 'producao' then 8 when 'planejamento' then 4 else 3 end) * coalesce(b.progresso,0) / 100.0, 1),
  coalesce(b.progresso, case when b.status = 'concluido' then 100 else 0 end),
  (case b.status
     when 'concluido' then 'concluida'
     when 'em_progresso' then 'em_andamento'
     when 'bloqueado' then 'bloqueada'
     else 'pendente' end)::etapa_status
from base b;
