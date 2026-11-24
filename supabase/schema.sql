-- =====================================================================
-- CultivaT · Esquema de Supabase
-- Pega TODO este archivo en Supabase → SQL Editor → Run.
--
-- Diseño de privacidad: solo se guarda Apodo + PIN (hasheado con bcrypt)
-- y el progreso del juego. La tabla tiene RLS activado SIN políticas,
-- así que la clave "anon" NO puede leerla directamente: todo pasa por
-- las funciones cultivat_login / cultivat_save, que verifican el PIN.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cultivat_profiles (
  id            uuid primary key default gen_random_uuid(),
  nickname      text not null,
  nickname_key  text generated always as (lower(btrim(nickname))) stored,
  pin_hash      text not null,
  state         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint cultivat_nickname_len check (char_length(btrim(nickname)) between 2 and 16),
  constraint cultivat_nickname_unique unique (nickname_key)
);

alter table public.cultivat_profiles enable row level security;
-- (sin políticas a propósito: acceso solo mediante las funciones de abajo)

-- ---------------------------------------------------------------------
-- Inicia sesión o crea la cuenta si el apodo no existe.
-- Devuelve: { ok, created, state } o { ok:false, error }
-- ---------------------------------------------------------------------
create or replace function public.cultivat_login(p_nickname text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.cultivat_profiles;
  v_nick text := btrim(coalesce(p_nickname, ''));
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'error', 'El PIN debe tener 4 números');
  end if;
  if char_length(v_nick) < 2 or char_length(v_nick) > 16 then
    return jsonb_build_object('ok', false, 'error', 'El apodo debe tener de 2 a 16 letras');
  end if;

  select * into r from public.cultivat_profiles where nickname_key = lower(v_nick);

  if not found then
    insert into public.cultivat_profiles (nickname, pin_hash)
    values (v_nick, crypt(p_pin, gen_salt('bf')))
    returning * into r;
    return jsonb_build_object('ok', true, 'created', true, 'state', null);
  end if;

  if r.pin_hash = crypt(p_pin, r.pin_hash) then
    return jsonb_build_object('ok', true, 'created', false, 'state', r.state);
  end if;

  return jsonb_build_object('ok', false, 'error', 'Ese apodo ya existe y el PIN no coincide');
end;
$$;

-- ---------------------------------------------------------------------
-- Guarda el progreso (verifica el PIN en cada guardado).
-- ---------------------------------------------------------------------
create or replace function public.cultivat_save(p_nickname text, p_pin text, p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.cultivat_profiles;
begin
  select * into r from public.cultivat_profiles where nickname_key = lower(btrim(p_nickname));
  if not found or r.pin_hash <> crypt(p_pin, r.pin_hash) then
    return jsonb_build_object('ok', false, 'error', 'No autorizado');
  end if;
  if pg_column_size(p_state) > 4000000 then
    return jsonb_build_object('ok', false, 'error', 'Progreso demasiado grande');
  end if;

  update public.cultivat_profiles
     set state = p_state, updated_at = now()
   where id = r.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cultivat_login(text, text) from public;
revoke all on function public.cultivat_save(text, text, jsonb) from public;
grant execute on function public.cultivat_login(text, text) to anon, authenticated;
grant execute on function public.cultivat_save(text, text, jsonb) to anon, authenticated;
