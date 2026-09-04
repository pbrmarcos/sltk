-- RFQ trilingual docs, proposal attachments, purchase conditions catalog.
-- Applied via scripts/migrate-dest.sh.

-- 1) Documentos RFQ gerados por insumo (histórico + links Drive)
create table if not exists public.insumo_documentos_gerados (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references public.projeto_insumos(id) on delete cascade,
  idioma text not null check (idioma in ('pt','es','en')),
  drive_file_id text,
  drive_view_url text,
  drive_folder_id text,
  drive_folder_url text,
  file_name text,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  gerado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_insumo_docs_insumo on public.insumo_documentos_gerados(insumo_id);

grant select, insert on public.insumo_documentos_gerados to authenticated;
grant all on public.insumo_documentos_gerados to service_role;

alter table public.insumo_documentos_gerados enable row level security;

drop policy if exists insumo_docs_select on public.insumo_documentos_gerados;
create policy insumo_docs_select on public.insumo_documentos_gerados
  for select to authenticated using (
    public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'manager'::app_role)
    or public.has_role(auth.uid(),'purchasing'::app_role)
    or gerado_por = auth.uid()
  );

drop policy if exists insumo_docs_insert on public.insumo_documentos_gerados;
create policy insumo_docs_insert on public.insumo_documentos_gerados
  for insert to authenticated with check (
    public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'manager'::app_role)
    or public.has_role(auth.uid(),'purchasing'::app_role)
  );

-- 2) Anexos de propostas de cotação (upload pelo portal público)
create table if not exists public.cotacao_proposta_anexos (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.cotacao_propostas(id) on delete cascade,
  file_name text not null,
  mime text,
  tamanho_bytes bigint,
  drive_file_id text,
  drive_view_url text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  origem text not null default 'portal_publico'
);

create index if not exists idx_prop_anexos_prop on public.cotacao_proposta_anexos(proposta_id);

grant select, insert on public.cotacao_proposta_anexos to authenticated;
grant all on public.cotacao_proposta_anexos to service_role;

alter table public.cotacao_proposta_anexos enable row level security;

drop policy if exists prop_anexos_select on public.cotacao_proposta_anexos;
create policy prop_anexos_select on public.cotacao_proposta_anexos
  for select to authenticated using (
    public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'manager'::app_role)
    or public.has_role(auth.uid(),'purchasing'::app_role)
  );

-- 3) Colunas de análise AI em cotacao_propostas
alter table public.cotacao_propostas
  add column if not exists resumo_ai text,
  add column if not exists valor_detectado numeric(18,2),
  add column if not exists moeda_detectada text,
  add column if not exists lead_time_detectado int,
  add column if not exists condicao_pagamento_detectada text,
  add column if not exists analise_status text default 'pendente',
  add column if not exists analisado_em timestamptz;

-- 4) Catálogo de condições de pagamento (pré-configuradas da indústria)
create table if not exists public.compras_condicoes_pagamento (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  descricao_pt text not null,
  descricao_es text,
  descricao_en text,
  dias_liquidos int,
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

grant select on public.compras_condicoes_pagamento to authenticated;
grant all on public.compras_condicoes_pagamento to service_role;

alter table public.compras_condicoes_pagamento enable row level security;

drop policy if exists cond_pag_select on public.compras_condicoes_pagamento;
create policy cond_pag_select on public.compras_condicoes_pagamento
  for select to authenticated using (true);

drop policy if exists cond_pag_write on public.compras_condicoes_pagamento;
create policy cond_pag_write on public.compras_condicoes_pagamento
  for all to authenticated using (
    public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'manager'::app_role)
  ) with check (
    public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'manager'::app_role)
  );

insert into public.compras_condicoes_pagamento (codigo, descricao_pt, descricao_es, descricao_en, dias_liquidos, ordem)
values
  ('AVISTA',       'À vista',                                    'Al contado',                              'Cash on delivery',                     0,   1),
  ('NET30',        '30 dias líquidos',                           '30 días netos',                           'Net 30',                               30,  2),
  ('NET45',        '45 dias líquidos',                           '45 días netos',                           'Net 45',                               45,  3),
  ('NET60',        '60 dias líquidos',                           '60 días netos',                           'Net 60',                               60,  4),
  ('30_60',        '30/60 dias',                                 '30/60 días',                              '30/60 days',                           60,  5),
  ('30_60_90',     '30/60/90 dias',                              '30/60/90 días',                           '30/60/90 days',                        90,  6),
  ('50_ANT_50_ENT','50% antecipado + 50% na entrega',            '50% anticipado + 50% a la entrega',       '50% upfront + 50% on delivery',        30,  7),
  ('30_PED_70_EMB','30% pedido + 70% embarque',                  '30% pedido + 70% embarque',               '30% order + 70% shipment',             45,  8),
  ('TT_30_70',     'T/T 30% adiantado + 70% contra B/L',         'T/T 30% adelanto + 70% contra B/L',       'T/T 30% advance + 70% against B/L',    60,  9),
  ('LC_SIGHT',     'Carta de crédito à vista (L/C sight)',       'Carta de crédito a la vista (L/C sight)', 'Letter of Credit at sight',            0,  10),
  ('LC_60',        'Carta de crédito 60 dias (L/C 60)',          'Carta de crédito 60 días (L/C 60)',       'Letter of Credit 60 days',             60, 11)
on conflict (codigo) do nothing;

-- 5) Cadastro de transportadoras
create table if not exists public.compras_transportadoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  contato text,
  telefone text,
  email text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null
);

grant select on public.compras_transportadoras to authenticated;
grant all on public.compras_transportadoras to service_role;

alter table public.compras_transportadoras enable row level security;

drop policy if exists transp_select on public.compras_transportadoras;
create policy transp_select on public.compras_transportadoras
  for select to authenticated using (true);

drop policy if exists transp_write on public.compras_transportadoras;
create policy transp_write on public.compras_transportadoras
  for all to authenticated using (
    public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'manager'::app_role)
    or public.has_role(auth.uid(),'purchasing'::app_role)
  ) with check (
    public.has_role(auth.uid(),'admin'::app_role)
    or public.has_role(auth.uid(),'manager'::app_role)
    or public.has_role(auth.uid(),'purchasing'::app_role)
  );
