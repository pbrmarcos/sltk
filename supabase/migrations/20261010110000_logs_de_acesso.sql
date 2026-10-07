-- Logs de acesso (Usuários & Permissões › Logs de acesso)
--
-- acesso_sessoes: uma linha por período de uso (entrada, último sinal, saída).
-- acesso_eventos: páginas abertas e ações feitas (funções do servidor chamadas)
--                 dentro da sessão.
-- acesso_falhas_login: tentativas de login recusadas (para diagnosticar
--                 "senha errada", conta inexistente, excesso de tentativas).
--
-- Leitura só para admin. Gravação só pelas funções abaixo (SECURITY DEFINER),
-- sempre em nome de auth.uid(), nunca de outro usuário.

create table if not exists public.acesso_sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  iniciada_em timestamptz not null default now(),
  ultimo_sinal_em timestamptz not null default now(),
  encerrada_em timestamptz,
  motivo_fim text check (motivo_fim in ('logout', 'inatividade')),
  ip text,
  user_agent text,
  paginas int not null default 0,
  acoes int not null default 0
);
create index if not exists acesso_sessoes_user_idx on public.acesso_sessoes (user_id, iniciada_em desc);
create index if not exists acesso_sessoes_iniciada_idx on public.acesso_sessoes (iniciada_em desc);

create table if not exists public.acesso_eventos (
  id bigint generated always as identity primary key,
  sessao_id uuid references public.acesso_sessoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('pagina', 'acao')),
  rota text,
  titulo text,
  funcao text,
  arquivo text,
  sucesso boolean not null default true,
  erro text,
  created_at timestamptz not null default now()
);
create index if not exists acesso_eventos_sessao_idx on public.acesso_eventos (sessao_id, created_at);
create index if not exists acesso_eventos_user_idx on public.acesso_eventos (user_id, created_at desc);

create table if not exists public.acesso_falhas_login (
  id bigint generated always as identity primary key,
  email text not null,
  motivo text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists acesso_falhas_login_idx on public.acesso_falhas_login (created_at desc);

alter table public.acesso_sessoes enable row level security;
alter table public.acesso_eventos enable row level security;
alter table public.acesso_falhas_login enable row level security;

drop policy if exists acesso_sessoes_admin_select on public.acesso_sessoes;
create policy acesso_sessoes_admin_select on public.acesso_sessoes for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
drop policy if exists acesso_eventos_admin_select on public.acesso_eventos;
create policy acesso_eventos_admin_select on public.acesso_eventos for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
drop policy if exists acesso_falhas_admin_select on public.acesso_falhas_login;
create policy acesso_falhas_admin_select on public.acesso_falhas_login for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select on public.acesso_sessoes, public.acesso_eventos, public.acesso_falhas_login to authenticated;

-- IP do cliente pelos cabeçalhos que o PostgREST repassa.
create or replace function public._acesso_ip()
returns text language sql stable as $$
  select nullif(split_part(coalesce(
    (nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for'),
    (nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip'), ''), ',', 1), '')
$$;

-- Abre uma sessão (ou devolve a atual se ainda está ativa há menos de 30 min).
create or replace function public.acesso_iniciar_sessao(_sessao uuid default null, _user_agent text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sid uuid;
begin
  if uid is null then return null; end if;
  if _sessao is not null then
    update acesso_sessoes set ultimo_sinal_em = now()
     where id = _sessao and user_id = uid and encerrada_em is null
       and ultimo_sinal_em > now() - interval '30 minutes'
    returning id into sid;
    if sid is not null then return sid; end if;
  end if;
  -- sessões abandonadas deste usuário viram "inatividade"
  update acesso_sessoes set encerrada_em = ultimo_sinal_em, motivo_fim = 'inatividade'
   where user_id = uid and encerrada_em is null and ultimo_sinal_em <= now() - interval '30 minutes';
  insert into acesso_sessoes(user_id, ip, user_agent) values (uid, _acesso_ip(), left(_user_agent, 400))
  returning id into sid;
  -- retenção: 180 dias (limpeza ocasional)
  if random() < 0.02 then
    delete from acesso_sessoes where iniciada_em < now() - interval '180 days';
    delete from acesso_falhas_login where created_at < now() - interval '180 days';
  end if;
  return sid;
end $$;

create or replace function public.acesso_sinal(_sessao uuid)
returns void language sql security definer set search_path = public as $$
  update acesso_sessoes set ultimo_sinal_em = now()
   where id = _sessao and user_id = auth.uid() and encerrada_em is null;
$$;

create or replace function public.acesso_encerrar(_sessao uuid)
returns void language sql security definer set search_path = public as $$
  update acesso_sessoes set ultimo_sinal_em = now(), encerrada_em = now(), motivo_fim = 'logout'
   where id = _sessao and user_id = auth.uid() and encerrada_em is null;
$$;

create or replace function public.acesso_registrar_pagina(_sessao uuid, _rota text, _titulo text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or _sessao is null then return; end if;
  if not exists (select 1 from acesso_sessoes where id = _sessao and user_id = uid) then return; end if;
  insert into acesso_eventos(sessao_id, user_id, tipo, rota, titulo)
  values (_sessao, uid, 'pagina', left(_rota, 300), left(_titulo, 200));
  update acesso_sessoes set paginas = paginas + 1, ultimo_sinal_em = now() where id = _sessao;
end $$;

create or replace function public.acesso_registrar_acao(_sessao uuid, _funcao text, _arquivo text, _sucesso boolean, _erro text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sid uuid;
begin
  if uid is null then return; end if;
  select id into sid from acesso_sessoes where id = _sessao and user_id = uid;
  insert into acesso_eventos(sessao_id, user_id, tipo, funcao, arquivo, sucesso, erro)
  values (sid, uid, 'acao', left(_funcao, 120), left(_arquivo, 200), coalesce(_sucesso, true), left(_erro, 300));
  if sid is not null then
    update acesso_sessoes set acoes = acoes + 1, ultimo_sinal_em = now() where id = sid;
  end if;
end $$;

-- Pode ser chamada sem login (tela de entrada). Limita volume por e-mail.
create or replace function public.acesso_registrar_falha_login(_email text, _motivo text, _user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if _email is null or length(_email) > 255 then return; end if;
  if (select count(*) from acesso_falhas_login
       where lower(email) = lower(_email) and created_at > now() - interval '10 minutes') >= 20 then
    return;
  end if;
  insert into acesso_falhas_login(email, motivo, ip, user_agent)
  values (lower(trim(_email)), left(_motivo, 120), _acesso_ip(), left(_user_agent, 400));
end $$;

revoke all on function public.acesso_iniciar_sessao(uuid, text) from public;
revoke all on function public.acesso_sinal(uuid) from public;
revoke all on function public.acesso_encerrar(uuid) from public;
revoke all on function public.acesso_registrar_pagina(uuid, text, text) from public;
revoke all on function public.acesso_registrar_acao(uuid, text, text, boolean, text) from public;
grant execute on function public.acesso_iniciar_sessao(uuid, text) to authenticated;
grant execute on function public.acesso_sinal(uuid) to authenticated;
grant execute on function public.acesso_encerrar(uuid) to authenticated;
grant execute on function public.acesso_registrar_pagina(uuid, text, text) to authenticated;
grant execute on function public.acesso_registrar_acao(uuid, text, text, boolean, text) to authenticated;
grant execute on function public.acesso_registrar_falha_login(text, text, text) to anon, authenticated;
