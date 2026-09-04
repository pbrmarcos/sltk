alter table public.lead_origens add column if not exists ordem integer not null default 0;

alter table public.lead_origens
  add column if not exists nome_norm text
  generated always as (
    lower(translate(nome,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
  ) stored;

create unique index if not exists lead_origens_nome_norm_uidx
  on public.lead_origens (nome_norm) where deleted_at is null;

-- Remove origens de demonstração não referenciadas
delete from public.lead_origens lo
 where lo.nome like 'DEMO •%'
   and not exists (select 1 from public.clientes c where c.lead_origem_id = lo.id);
update public.lead_origens set ativo = false
 where nome like 'DEMO •%';

insert into public.lead_origens (nome, ordem, ativo)
select v.nome, v.ordem, true
from (values
  ('Campanha Google ADS', 10),
  ('Feiras', 20),
  ('Indicação de Fornecedor', 30),
  ('Indicação de Cliente', 40),
  ('Indicação de Finder', 50),
  ('Site Institucional', 60),
  ('Mineração Penta', 70),
  ('Mineração Apollo', 80),
  ('Mineração API PAIS', 90),
  ('Pesquisas Comerciais (Supermercados e Estabelecimentos)', 100),
  ('Representante', 110)
) as v(nome, ordem)
where not exists (
  select 1 from public.lead_origens lo
   where lo.deleted_at is null
     and lo.nome_norm = lower(translate(v.nome,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
);

update public.lead_origens set ordem = 70, ativo = true where nome_norm = 'mineracao penta';
