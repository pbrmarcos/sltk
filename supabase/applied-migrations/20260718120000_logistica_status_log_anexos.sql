-- Anexos vinculados a cada mudança de status na trilha de auditoria de embarques.
-- Guardamos apenas as referências (uuid[]) para linhas de logistica_embarque_anexos.
alter table public.logistica_embarque_status_log
  add column if not exists anexo_ids uuid[] not null default '{}';

-- Índice GIN para consultas por anexo, se necessário no futuro
create index if not exists idx_logistica_status_log_anexo_ids
  on public.logistica_embarque_status_log using gin (anexo_ids);
