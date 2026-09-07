-- compras_transportadoras so tinha "grant select ... to authenticated" desde
-- a criacao (20260701120000_rfq_docs_and_condicoes.sql). A policy transp_write
-- ja liberava insert/update/delete pra admin/manager/purchasing via RLS, mas
-- sem o GRANT de tabela nenhum usuario autenticado conseguia escrever --
-- Postgres nega no nivel de privilegio antes mesmo de avaliar a RLS. Isso
-- explica por que a tabela nunca teve nenhuma createServerFn de escrita: uma
-- tentativa teria falhado com "permission denied for table" pra qualquer
-- usuario, inclusive admin.

grant insert, update, delete on public.compras_transportadoras to authenticated;
