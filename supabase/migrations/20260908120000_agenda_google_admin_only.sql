-- agenda_google_email/agenda_provider deixam de ser self-service (decisão de
-- produto: quem provisiona o Google Workspace de cada usuário é o admin, não
-- o próprio usuário). A RLS de profiles (profiles_self_update) é só por
-- linha, sem restrição por coluna -- sem um guard aqui, tirar esses campos
-- da UI seria só cosmético, já que qualquer usuário autenticado poderia
-- gravar neles direto via Supabase client. auth.uid() IS NULL (chamadas com
-- client de service role, ex. updateAdminUser) sempre passa.

create or replace function public.tg_guard_agenda_google_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.agenda_google_email is distinct from old.agenda_google_email
      or new.agenda_provider is distinct from old.agenda_provider)
     and auth.uid() is not null
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Apenas administradores podem alterar o e-mail/provedor Google desta conta.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_agenda_google on public.profiles;
create trigger profiles_guard_agenda_google
  before update on public.profiles
  for each row execute function public.tg_guard_agenda_google_fields();
