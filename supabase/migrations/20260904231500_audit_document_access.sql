-- Cobertura que faltava na auditoria (item 4 de
-- .lovable/plan/auditoria-o-que-está-quebrado-e-como-corrigir-2026-08-20.md):
-- acesso/download de documento restrito não gerava nenhuma linha em audit_log.
-- audit_action só tinha INSERT/UPDATE/DELETE; adiciona ACCESS pra registro
-- de leitura (metadados apenas — nenhum dado do arquivo é gravado).
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'ACCESS';
