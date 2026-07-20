-- Phase 3B: profiles, cloud game results, and tiered leaderboard RPCs.
-- Run this file in Supabase SQL Editor. It contains no secret keys.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(trim(nickname)) between 2 and 20)
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  game_id text not null unique,
  player_id uuid not null references public.profiles(id) on delete cascade,
  game_type text not null default 'sunzi-solitaire',
  difficulty_level text not null,
  score integer not null,
  completion_time integer not null,
  pass_count integer not null,
  error_count integer not null default 0,
  hint_count integer not null default 0,
  completed boolean not null default true,
  game_version text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  hidden_number_count integer,
  constraint game_results_difficulty_level_check check (difficulty_level in ('L1', 'L2', 'L3', 'L4', 'L5')),
  constraint game_results_completed_check check (completed is true),
  constraint game_results_score_check check (score >= 0),
  constraint game_results_completion_time_check check (completion_time > 0),
  constraint game_results_pass_count_check check (pass_count >= 0),
  constraint game_results_error_count_check check (error_count >= 0),
  constraint game_results_hint_count_check check (hint_count >= 0),
  constraint game_results_hidden_count_check check (hidden_number_count is null or hidden_number_count between 0 and 52),
  constraint game_results_time_order_check check (completed_at >= started_at)
);

create index if not exists game_results_player_idx on public.game_results (player_id);
create index if not exists game_results_score_board_idx on public.game_results (difficulty_level, completed, score desc, completion_time asc, pass_count asc, completed_at asc);
create index if not exists game_results_speed_board_idx on public.game_results (difficulty_level, completed, completion_time asc, score desc, pass_count asc, completed_at asc);
create index if not exists game_results_player_difficulty_idx on public.game_results (player_id, difficulty_level, completed);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.game_results enable row level security;

-- Explicit table grants are required when Supabase automatic table exposure/grants are disabled.
-- Actual row visibility remains constrained by the RLS policies below.
grant select, insert, update
on table public.profiles
to authenticated;

grant select, insert
on table public.game_results
to authenticated;

-- profiles: players manage only their own profile. Public nickname reads are exposed through RPCs below.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- game_results: players can insert/read their own submitted results; no update/delete policy.
drop policy if exists game_results_insert_own on public.game_results;
create policy game_results_insert_own
on public.game_results for insert
to authenticated
with check (player_id = auth.uid());

drop policy if exists game_results_select_own on public.game_results;
create policy game_results_select_own
on public.game_results for select
to authenticated
using (player_id = auth.uid());

create or replace function public.get_leaderboard_top(
  p_difficulty_level text,
  p_board text default 'score',
  p_limit integer default 20
)
returns table (
  rank integer,
  nickname text,
  score integer,
  completion_time integer,
  pass_count integer,
  hint_count integer,
  completed_at timestamptz,
  is_me boolean
)
language sql
security definer
set search_path = public
as $$
  with filtered as (
    select gr.*, p.nickname
    from public.game_results gr
    join public.profiles p on p.id = gr.player_id
    where gr.completed is true
      and gr.difficulty_level = p_difficulty_level
      and p_difficulty_level in ('L1', 'L2', 'L3', 'L4', 'L5')
      and p_board in ('score', 'speed')
  ), per_player as (
    select *,
      row_number() over (
        partition by player_id
        order by
          case when p_board = 'score' then score end desc nulls last,
          case when p_board = 'score' then completion_time end asc nulls last,
          case when p_board = 'score' then pass_count end asc nulls last,
          case when p_board = 'speed' then completion_time end asc nulls last,
          case when p_board = 'speed' then score end desc nulls last,
          case when p_board = 'speed' then pass_count end asc nulls last,
          completed_at asc,
          game_id asc
      ) as player_row
    from filtered
  ), ranked as (
    select *,
      row_number() over (
        order by
          case when p_board = 'score' then score end desc nulls last,
          case when p_board = 'score' then completion_time end asc nulls last,
          case when p_board = 'score' then pass_count end asc nulls last,
          case when p_board = 'speed' then completion_time end asc nulls last,
          case when p_board = 'speed' then score end desc nulls last,
          case when p_board = 'speed' then pass_count end asc nulls last,
          completed_at asc,
          game_id asc
      ) as board_rank
    from per_player
    where player_row = 1
  )
  select board_rank::integer as rank,
    nickname,
    score,
    completion_time,
    pass_count,
    hint_count,
    completed_at,
    (player_id = auth.uid()) as is_me
  from ranked
  order by board_rank
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.get_my_leaderboard_rank(
  p_difficulty_level text,
  p_board text default 'score'
)
returns table (
  rank integer,
  nickname text,
  score integer,
  completion_time integer,
  pass_count integer,
  hint_count integer,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with filtered as (
    select gr.*, p.nickname
    from public.game_results gr
    join public.profiles p on p.id = gr.player_id
    where gr.completed is true
      and gr.difficulty_level = p_difficulty_level
      and p_difficulty_level in ('L1', 'L2', 'L3', 'L4', 'L5')
      and p_board in ('score', 'speed')
      and auth.uid() is not null
  ), per_player as (
    select *,
      row_number() over (
        partition by player_id
        order by
          case when p_board = 'score' then score end desc nulls last,
          case when p_board = 'score' then completion_time end asc nulls last,
          case when p_board = 'score' then pass_count end asc nulls last,
          case when p_board = 'speed' then completion_time end asc nulls last,
          case when p_board = 'speed' then score end desc nulls last,
          case when p_board = 'speed' then pass_count end asc nulls last,
          completed_at asc,
          game_id asc
      ) as player_row
    from filtered
  ), ranked as (
    select *,
      row_number() over (
        order by
          case when p_board = 'score' then score end desc nulls last,
          case when p_board = 'score' then completion_time end asc nulls last,
          case when p_board = 'score' then pass_count end asc nulls last,
          case when p_board = 'speed' then completion_time end asc nulls last,
          case when p_board = 'speed' then score end desc nulls last,
          case when p_board = 'speed' then pass_count end asc nulls last,
          completed_at asc,
          game_id asc
      ) as board_rank
    from per_player
    where player_row = 1
  )
  select board_rank::integer as rank,
    nickname,
    score,
    completion_time,
    pass_count,
    hint_count,
    completed_at
  from ranked
  where player_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_leaderboard_top(text, text, integer) from public;
revoke all on function public.get_my_leaderboard_rank(text, text) from public;
grant execute on function public.get_leaderboard_top(text, text, integer) to anon, authenticated;
grant execute on function public.get_my_leaderboard_rank(text, text) to authenticated;
