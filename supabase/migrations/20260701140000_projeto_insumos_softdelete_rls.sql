-- Fix soft-delete on projeto_insumos: PostgREST re-evaluates SELECT USING
-- after UPDATE and the previous policy (deleted_at IS NULL) caused
-- "new row violates row-level security policy" when marking as deleted.
-- Queries already filter deleted_at explicitly.
drop policy if exists "projeto_insumos_select" on public.projeto_insumos;
create policy "projeto_insumos_select" on public.projeto_insumos
for select to authenticated
using (true);
