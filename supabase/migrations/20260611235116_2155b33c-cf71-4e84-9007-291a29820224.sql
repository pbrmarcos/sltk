
-- ENUMS
create type public.fat_status as enum ('rascunho','em_execucao','aguardando_homologacao','homologado','reprovado');
create type public.fat_item_status as enum ('pendente','ok','nok','na');
create type public.fat_rnc_status as enum ('aberta','em_tratativa','fechada','cancelada');
create type public.fat_assinatura_tipo as enum ('inspetor','testemunha');

-- SEQUENCE p/ código FAT-YYYY-NNNN
create sequence if not exists public.fat_codigo_seq start 1;

-- ============================================================
-- 1) fat_relatorios
-- ============================================================
create table public.fat_relatorios (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  processo_id uuid not null references public.processos(id) on delete restrict,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  os_codigo text,
  tag_equipamento text,
  data_ensaio date,
  hora_inicio time,
  inspetor_id uuid references auth.users(id),
  testemunha_nome text,
  local_ensaio text,
  temperatura_c numeric(5,2),
  umidade_rel numeric(5,2),
  tensao_alimentacao text,
  motivos_viagem text[] not null default '{}',
  periodo_de date,
  periodo_ate date,
  tecnicos text,
  status public.fat_status not null default 'rascunho',
  progresso int not null default 0,
  ok_count int not null default 0,
  nok_count int not null default 0,
  na_count int not null default 0,
  observacoes_gerais text,
  homologado_em timestamptz,
  homologado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz
);

grant select, insert, update, delete on public.fat_relatorios to authenticated;
grant all on public.fat_relatorios to service_role;
grant usage, select on sequence public.fat_codigo_seq to authenticated, service_role;

alter table public.fat_relatorios enable row level security;

create policy "fat_relatorios_select" on public.fat_relatorios
  for select to authenticated
  using (
    deleted_at is null and (
      public.has_role(auth.uid(),'admin') or
      public.has_role(auth.uid(),'manager') or
      public.can_access_module(auth.uid(),'qualidade'::public.app_module)
    )
  );

create policy "fat_relatorios_insert" on public.fat_relatorios
  for insert to authenticated
  with check (
    public.has_role(auth.uid(),'admin') or
    public.has_role(auth.uid(),'manager') or
    public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  );

create policy "fat_relatorios_update" on public.fat_relatorios
  for update to authenticated
  using (
    public.has_role(auth.uid(),'admin') or
    public.has_role(auth.uid(),'manager') or
    public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  )
  with check (true);

create policy "fat_relatorios_delete" on public.fat_relatorios
  for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

-- Trigger: codigo + updated_at
create or replace function public.tg_fat_set_codigo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'FAT-' || to_char(now(),'YYYY') || '-'
      || lpad(nextval('public.fat_codigo_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger fat_relatorios_codigo before insert on public.fat_relatorios
  for each row execute function public.tg_fat_set_codigo();
create trigger fat_relatorios_updated_at before update on public.fat_relatorios
  for each row execute function public.tg_set_updated_at();

create or replace function public.tg_fat_set_updated_by()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_by := auth.uid(); return new; end $$;
create trigger fat_relatorios_updated_by before update on public.fat_relatorios
  for each row execute function public.tg_fat_set_updated_by();

-- Audit
create or replace function public.tg_fat_audit()
returns trigger language plpgsql set search_path = public as $$
declare col text; cols text[] := array['status','progresso','homologado_em','observacoes_gerais','inspetor_id','testemunha_nome','deleted_at'];
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, table_name, record_id, action, new_value)
    values (auth.uid(), 'fat_relatorios', new.id::text, 'INSERT', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    foreach col in array cols loop
      if to_jsonb(new) -> col is distinct from to_jsonb(old) -> col then
        insert into public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        values (auth.uid(), 'fat_relatorios', new.id::text, 'UPDATE', col, to_jsonb(old) -> col, to_jsonb(new) -> col);
      end if;
    end loop;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (user_id, table_name, record_id, action, old_value)
    values (auth.uid(), 'fat_relatorios', old.id::text, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end $$;
create trigger fat_relatorios_audit after insert or update or delete on public.fat_relatorios
  for each row execute function public.tg_fat_audit();

-- ============================================================
-- 2) fat_checklist_template
-- ============================================================
create table public.fat_checklist_template (
  id uuid primary key default gen_random_uuid(),
  secao text not null,
  ordem int not null default 0,
  titulo text not null,
  descricao text,
  requer_foto_nok boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.fat_checklist_template to authenticated;
grant all on public.fat_checklist_template to service_role;

alter table public.fat_checklist_template enable row level security;
create policy "fat_chk_tpl_select" on public.fat_checklist_template
  for select to authenticated using (ativo);
create policy "fat_chk_tpl_admin_write" on public.fat_checklist_template
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger fat_chk_tpl_updated_at before update on public.fat_checklist_template
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 3) fat_checklist_resposta
-- ============================================================
create table public.fat_checklist_resposta (
  id uuid primary key default gen_random_uuid(),
  fat_id uuid not null references public.fat_relatorios(id) on delete cascade,
  template_id uuid not null references public.fat_checklist_template(id) on delete restrict,
  status public.fat_item_status not null default 'pendente',
  comentario text,
  foto_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (fat_id, template_id)
);

grant select, insert, update, delete on public.fat_checklist_resposta to authenticated;
grant all on public.fat_checklist_resposta to service_role;

alter table public.fat_checklist_resposta enable row level security;
create policy "fat_chk_resp_rw" on public.fat_checklist_resposta
  for all to authenticated
  using (
    exists (select 1 from public.fat_relatorios f where f.id = fat_id and f.deleted_at is null)
    and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
         or public.can_access_module(auth.uid(),'qualidade'::public.app_module))
  )
  with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  );

create trigger fat_chk_resp_updated_at before update on public.fat_checklist_resposta
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 4) fat_medicoes
-- ============================================================
create table public.fat_medicoes (
  id uuid primary key default gen_random_uuid(),
  fat_id uuid not null references public.fat_relatorios(id) on delete cascade,
  ordem int not null default 0,
  parametro text not null,
  unidade text,
  nominal numeric,
  tolerancia text,
  medido numeric,
  status_auto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.fat_medicoes to authenticated;
grant all on public.fat_medicoes to service_role;

alter table public.fat_medicoes enable row level security;
create policy "fat_med_rw" on public.fat_medicoes
  for all to authenticated
  using (
    exists (select 1 from public.fat_relatorios f where f.id = fat_id and f.deleted_at is null)
    and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
         or public.can_access_module(auth.uid(),'qualidade'::public.app_module))
  )
  with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  );

create trigger fat_med_updated_at before update on public.fat_medicoes
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 5) fat_rnc
-- ============================================================
create sequence if not exists public.fat_rnc_seq start 1;
grant usage, select on sequence public.fat_rnc_seq to authenticated, service_role;

create table public.fat_rnc (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  fat_id uuid not null references public.fat_relatorios(id) on delete cascade,
  origem_resposta_id uuid references public.fat_checklist_resposta(id) on delete set null,
  origem_medicao_id uuid references public.fat_medicoes(id) on delete set null,
  titulo text not null,
  descricao text,
  plano_acao text,
  responsavel_id uuid references auth.users(id),
  prazo date,
  status public.fat_rnc_status not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

grant select, insert, update, delete on public.fat_rnc to authenticated;
grant all on public.fat_rnc to service_role;

alter table public.fat_rnc enable row level security;
create policy "fat_rnc_rw" on public.fat_rnc
  for all to authenticated
  using (
    exists (select 1 from public.fat_relatorios f where f.id = fat_id and f.deleted_at is null)
    and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
         or public.can_access_module(auth.uid(),'qualidade'::public.app_module))
  )
  with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  );

create or replace function public.tg_fat_rnc_set_codigo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'RNC-' || lpad(nextval('public.fat_rnc_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger fat_rnc_codigo before insert on public.fat_rnc
  for each row execute function public.tg_fat_rnc_set_codigo();
create trigger fat_rnc_updated_at before update on public.fat_rnc
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 6) fat_assinaturas
-- ============================================================
create table public.fat_assinaturas (
  id uuid primary key default gen_random_uuid(),
  fat_id uuid not null references public.fat_relatorios(id) on delete cascade,
  tipo public.fat_assinatura_tipo not null,
  nome text not null,
  cargo text,
  assinatura_svg text not null,
  hash_sha256 text not null,
  assinado_em timestamptz not null default now(),
  assinado_ip text,
  unique (fat_id, tipo)
);

grant select, insert, delete on public.fat_assinaturas to authenticated;
grant all on public.fat_assinaturas to service_role;

alter table public.fat_assinaturas enable row level security;
create policy "fat_assin_rw" on public.fat_assinaturas
  for all to authenticated
  using (
    exists (select 1 from public.fat_relatorios f where f.id = fat_id and f.deleted_at is null)
    and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
         or public.can_access_module(auth.uid(),'qualidade'::public.app_module))
  )
  with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  );

-- ============================================================
-- SEED checklist template
-- ============================================================
insert into public.fat_checklist_template (secao, ordem, titulo, requer_foto_nok) values
-- Inspeção visual e dimensional
('inspecao_visual', 1, 'Estrutura mecânica isenta de avarias, riscos ou amassados', true),
('inspecao_visual', 2, 'Acabamento de pintura conforme padrão Solutek (RAL 7035)', true),
('inspecao_visual', 3, 'Identificação de placas, etiquetas e TAGs legíveis', false),
('inspecao_visual', 4, 'Dimensões gerais conforme desenho de fabricação (±2 mm)', false),
('inspecao_visual', 5, 'Aterramento equipotencial verificado em todos os pontos', true),

-- Documentação e manuais (do legado)
('documentacao', 1, 'Desenhos elétricos disponíveis e atualizados', false),
('documentacao', 2, 'Manual de operação e manutenção entregue', false),
('documentacao', 3, 'Cópia digital de todos os manuais (operacional, manutenção, peças, elétrico)', false),
('documentacao', 4, 'Requisitos de ar e elétricos para a instalação documentados', false),
('documentacao', 5, 'Lista de materiais com números de peças OEM', false),
('documentacao', 6, 'Diagrama pneumático disponível', false),

-- Segurança (do legado)
('seguranca', 1, 'Equipamento não apresenta riscos não mitigados', true),
('seguranca', 2, 'Normas de segurança aplicadas (CE, NR-12, etc.)', false),
('seguranca', 3, 'Botoeiras de emergência atuam em todos os pontos (categoria 3)', true),
('seguranca', 4, 'Proteções fixas e móveis instaladas conforme projeto', true),

-- Ensaios elétricos
('ensaios_eletricos', 1, 'Resistência de isolação > 100 MΩ @ 500 Vcc', false),
('ensaios_eletricos', 2, 'Rigidez dielétrica 2 kV / 1 min sem disrupção', false),
('ensaios_eletricos', 3, 'Continuidade do circuito de proteção (PE) < 0,1 Ω', false),
('ensaios_eletricos', 4, 'Sequência de fases conforme diagrama unifilar', false),
('ensaios_eletricos', 5, 'Atuação dos disjuntores e seccionadores conforme setpoint', false),

-- Funcional / automação
('funcional', 1, 'Energização do CLP e HMI sem falhas no boot', false),
('funcional', 2, 'Comunicação Profinet / Modbus estável (sem perda de pacotes)', false),
('funcional', 3, 'Alarmes e intertravamentos conforme matriz de causa-efeito', false),
('funcional', 4, 'Receitas e parâmetros do processo carregados corretamente', false),

-- Educação e treinamento (do legado)
('treinamento', 1, 'Datas dos treinamentos e nomes das pessoas treinadas registradas', false),
('treinamento', 2, 'Operadores e equipes de manutenção foram treinados', false),

-- Envio e recebimento (do legado)
('envio', 1, 'Equipamento devidamente embalado para transporte', true),
('envio', 2, 'Instruções de movimentação e recebimento entregues', false),

-- Qualidade do produto (do legado)
('qualidade_produto', 1, 'Integridade do selo/embalagem dentro do padrão', true),
('qualidade_produto', 2, 'Distribuição do produto conforme especificação', false),
('qualidade_produto', 3, 'Dimensões finais conforme especificação', false),
('qualidade_produto', 4, 'Selagem conforme especificação', true),
('qualidade_produto', 5, 'Aparência final conforme padrão', true);

-- Habilita módulo qualidade para roles relevantes (compl. ao seed existente)
insert into public.role_module_permissions (role, module, enabled) values
  ('assembly','qualidade',true),
  ('field','qualidade',true)
on conflict (role, module) do update set enabled = true;
