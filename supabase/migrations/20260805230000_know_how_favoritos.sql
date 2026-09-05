-- Know-how: favoritos por usuário
create table if not exists public.kh_favoritos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.kh_itens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

create index if not exists idx_kh_fav_user on public.kh_favoritos(user_id);
create index if not exists idx_kh_fav_item on public.kh_favoritos(item_id);

grant select, insert, delete on public.kh_favoritos to authenticated;
grant all on public.kh_favoritos to service_role;
alter table public.kh_favoritos enable row level security;

drop policy if exists "kh_favoritos self read" on public.kh_favoritos;
create policy "kh_favoritos self read" on public.kh_favoritos
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "kh_favoritos self insert" on public.kh_favoritos;
create policy "kh_favoritos self insert" on public.kh_favoritos
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "kh_favoritos self delete" on public.kh_favoritos;
create policy "kh_favoritos self delete" on public.kh_favoritos
  for delete to authenticated using (user_id = auth.uid());
