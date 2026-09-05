alter table public.oportunidades add column if not exists valor_estimado_usd numeric(15,2);
comment on column public.oportunidades.valor_estimado_usd is 'Valor estimado em USD, informado manualmente.';
