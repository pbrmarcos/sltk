-- Limpa cache de enrichment com payloads "junk" (/null/ etc) e reseta máscara PY.
delete from public.enrich_cache where pais in ('PA','UY','PY');

update public.paises_config
   set documento_mascara = 'XXXXXXXX-X'
 where codigo = 'PY';
