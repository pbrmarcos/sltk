-- O módulo "Processos / Pipeline" nunca protegeu nada: nenhuma tela, nenhuma
-- função de servidor conferia esse módulo (confirmado por auditoria completa
-- de permissões) — era um toggle decorativo em Usuários & Permissões. O
-- motor de Pipeline/CRM (processos.functions.ts) passou a usar o módulo
-- "comercial", que já é o dono real dessa tela no menu.
--
-- Remove só as linhas órfãs da matriz dinâmica — não mexe no enum
-- public.app_module em si (Postgres não permite remover um valor de enum
-- sem recriar o tipo inteiro; manter "processos" ali, sem nenhuma linha
-- usando ele, é inofensivo).

DELETE FROM public.role_module_permissions WHERE module = 'processos';
