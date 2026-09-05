-- Extra fields for etapa template items and bom items (all nullable / defaulted)
alter table public.etapa_template_item
  add column if not exists duracao_h numeric,
  add column if not exists responsavel_role text,
  add column if not exists depende_de uuid references public.etapa_template_item(id) on delete set null,
  add column if not exists entregavel text,
  add column if not exists requer_anexo boolean not null default false,
  add column if not exists checklist jsonb not null default '[]'::jsonb;

alter table public.etapa_template_bom_item
  add column if not exists part_number text,
  add column if not exists fabricante text,
  add column if not exists link text,
  add column if not exists observacoes text;

comment on column public.etapa_template_item.duracao_h is 'Duração estimada em horas (opcional).';
comment on column public.etapa_template_item.responsavel_role is 'Role padrão (admin/manager/engineer/assembly/production/purchasing/sales/field).';
comment on column public.etapa_template_item.depende_de is 'Etapa predecessora dentro do mesmo template.';
comment on column public.etapa_template_item.entregavel is 'Descrição do entregável esperado.';
comment on column public.etapa_template_item.requer_anexo is 'Se true, o equipamento exige anexo para fechar essa etapa.';
comment on column public.etapa_template_item.checklist is 'Lista de sub-tarefas: [{ "texto": "..." }] em ordem.';
