-- "Minerar dados" na ficha do cliente: guarda o resultado da pesquisa
-- (Receita, site, Google via Gemini) e a nota A/B/C do motor de qualificação.
alter table public.clientes
  add column if not exists mineracao_ia jsonb,
  add column if not exists mineracao_grade text,
  add column if not exists minerado_em timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clientes_mineracao_grade_check'
  ) then
    alter table public.clientes
      add constraint clientes_mineracao_grade_check
      check (mineracao_grade is null or mineracao_grade in ('A', 'B', 'C'));
  end if;
end $$;
