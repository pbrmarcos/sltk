-- Corrige máscara/regex do RUC do Paraguai e limpa cache vazio.
update public.paises_config
   set documento_mascara = 'XXXXXXXX-X',
       documento_regex   = '^[0-9]{6,9}$'
 where codigo = 'PY';

-- Remove cache de enriquecimento sem dados úteis (payload vazio).
delete from public.enrich_cache
 where coalesce(nullif(payload->>'razao_social',''), '') = ''
   and coalesce(nullif(payload->>'nome_fantasia',''), '') = '';
