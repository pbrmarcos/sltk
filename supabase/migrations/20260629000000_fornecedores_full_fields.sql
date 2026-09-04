-- ============================================================
-- Fornecedores — campos completos + busca full-text por keywords/tags
-- v0.51.0
-- ============================================================

alter table public.fornecedores
  -- fiscais/legais
  add column if not exists tax_id              text,
  add column if not exists tax_id_tipo         text,
  add column if not exists incorporation_year  int,
  add column if not exists legal_name_local    text,
  -- comercial
  add column if not exists moeda_padrao        text,
  add column if not exists incoterm_padrao     text,
  add column if not exists porto_origem        text,
  add column if not exists lead_time_dias      int,
  add column if not exists moq                 int,
  add column if not exists payment_terms       text,
  add column if not exists condicao_pagamento_dias int,
  -- capacidade & qualidade
  add column if not exists funcionarios_faixa  text,
  add column if not exists fabrica_area_m2     int,
  add column if not exists capacidade_mensal   text,
  add column if not exists certificacoes       text[] not null default '{}',
  add column if not exists auditado_em         date,
  add column if not exists auditor             text,
  add column if not exists score_qualidade     numeric(5,2),
  add column if not exists score_entrega       numeric(5,2),
  add column if not exists score_preco         numeric(5,2),
  -- contato corporativo extra
  add column if not exists whatsapp_corp       text,
  add column if not exists wechat_corp         text,
  add column if not exists linkedin_url        text,
  add column if not exists alibaba_url         text,
  add column if not exists made_in_china_url   text,
  -- logística
  add column if not exists endereco_cep                text,
  add column if not exists endereco_estado_provincia   text,
  add column if not exists fuso_horario                text,
  -- operacional
  add column if not exists responsavel_interno_user_id uuid references auth.users(id),
  add column if not exists proxima_revisao_em          date,
  add column if not exists motivo_bloqueio             text,
  -- busca
  add column if not exists palavras_chave              text[] not null default '{}',
  add column if not exists search_tsv          tsvector;

create or replace function public.tg_fornecedores_set_tsv()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.nome, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.nome_fantasia, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.legal_name_local, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.codigo, '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.palavras_chave, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.certificacoes, '{}'::text[]), ' ')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.cidade, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.endereco, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(new.observacoes, '')), 'D');
  return new;
end $$;

drop trigger if exists tg_fornecedores_set_tsv on public.fornecedores;
create trigger tg_fornecedores_set_tsv
  before insert or update of
    nome, nome_fantasia, legal_name_local, codigo,
    palavras_chave, tags, certificacoes, cidade, endereco, observacoes
  on public.fornecedores
  for each row execute function public.tg_fornecedores_set_tsv();

-- backfill (toca updated_at para disparar nada; usa update específico)
update public.fornecedores set nome = nome where search_tsv is null;

create index if not exists fornecedores_search_tsv_idx
  on public.fornecedores using gin (search_tsv);
create index if not exists fornecedores_palavras_chave_idx
  on public.fornecedores using gin (palavras_chave);
create index if not exists fornecedores_certificacoes_idx
  on public.fornecedores using gin (certificacoes);
create index if not exists fornecedores_responsavel_idx
  on public.fornecedores (responsavel_interno_user_id)
  where deleted_at is null;
create index if not exists fornecedores_proxima_revisao_idx
  on public.fornecedores (proxima_revisao_em)
  where deleted_at is null and proxima_revisao_em is not null;
