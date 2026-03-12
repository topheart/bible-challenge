-- Supabase Setup Script for Bible Challenge
-- Run this in the Supabase SQL Editor to initialize your database.

-- 1. Enable UUID extension (usually enabled by default, but good to be sure)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==========================================
-- Table: scores
-- Stores game results for the leaderboard.
-- ==========================================

create table if not exists public.scores (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default now(),
    client_record_id text,
    
    -- Core Player Info
    player_name text not null,
    score integer not null,
    difficulty text not null, -- 'easy', 'normal', 'hard'
    mode text default 'ranking', -- 'ranking' | 'practice' | 'replay'
    play_mode text default 'classic', -- 'classic' | 'survival' | 'replay'
    
    -- Game Stats
    correct_answers integer,
    total_questions integer,
    total_mistakes integer,
    completed boolean,
    
    -- Time & Display
    date text, -- Client-side formatted date string
    time text, -- Client-side formatted duration string
    
    -- Analysis Data
    level_results jsonb, -- Breakdown of performance per level
    range text,
    rarity text,
    testament text,
    custom_books jsonb, -- For custom book selections
    
    -- Hints & Bonuses
    hints_remaining integer,
    total_hints integer,
    used_hints_count integer,
    show_time_reward boolean,
    time_reward integer,
    
    -- Thematic Content
    closing_verse text,
    closing_verse_ref text,
    achievements jsonb default '[]'::jsonb, -- Unlocked achievements snapshot for this score
    
    -- Replay / Snapshot Data (Heavy)
    question_snapshot jsonb, 

    -- Performance / Combo Stats
    avg_answer_ms integer,
    avg_perfect_answer_ms integer,
    perfect_answer_count integer,
    max_combo_reached integer,
    combo_total_bonus integer,

    -- Optional flag: developer seeded/testing record
    is_seed boolean default false,
    
    -- Environment Layout
    project_tag text default 'bible-challenge-prod'
);

-- Index for faster leaderboard queries (sorting by score descending)
create index if not exists scores_score_idx on public.scores (score desc);
create index if not exists scores_project_tag_idx on public.scores (project_tag);

-- Backward-compatible migration: older environments may miss this column
alter table if exists public.scores
    add column if not exists achievements jsonb default '[]'::jsonb;

-- Backward-compatible migration: older environments may miss play_mode
alter table if exists public.scores
    add column if not exists play_mode text default 'classic';

alter table if exists public.scores
    add column if not exists client_record_id text;

create index if not exists scores_client_record_id_idx on public.scores (client_record_id);

create unique index if not exists scores_client_record_id_uidx
    on public.scores (client_record_id)
    where client_record_id is not null;

alter table if exists public.scores
    add column if not exists avg_answer_ms integer;

alter table if exists public.scores
    add column if not exists avg_perfect_answer_ms integer;

alter table if exists public.scores
    add column if not exists perfect_answer_count integer;

alter table if exists public.scores
    add column if not exists max_combo_reached integer;

alter table if exists public.scores
    add column if not exists combo_total_bonus integer;

alter table if exists public.scores
    add column if not exists is_seed boolean default false;

update public.scores
set play_mode = coalesce(play_mode, case when mode in ('survival','classic') then mode else 'classic' end)
where play_mode is null;

create index if not exists scores_play_mode_score_idx on public.scores (play_mode, score desc);

-- Add constraints defensively (NOT VALID = enforce new rows, avoid breaking old data migration)
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'scores_player_name_len_chk' and conrelid = 'public.scores'::regclass
    ) then
        alter table public.scores
            add constraint scores_player_name_len_chk
            check (char_length(btrim(player_name)) between 1 and 10) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'scores_score_range_chk' and conrelid = 'public.scores'::regclass
    ) then
        alter table public.scores
            add constraint scores_score_range_chk
            check (score between 0 and 2000000) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'scores_difficulty_chk' and conrelid = 'public.scores'::regclass
    ) then
        alter table public.scores
            add constraint scores_difficulty_chk
            check (difficulty in ('easy','normal','hard')) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'scores_mode_chk' and conrelid = 'public.scores'::regclass
    ) then
        alter table public.scores
            add constraint scores_mode_chk
            check (mode is null or mode in ('ranking','practice','replay')) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'scores_play_mode_chk' and conrelid = 'public.scores'::regclass
    ) then
        alter table public.scores
            add constraint scores_play_mode_chk
            check (play_mode is null or play_mode in ('classic','survival','replay')) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'scores_non_negative_counts_chk' and conrelid = 'public.scores'::regclass
    ) then
        alter table public.scores
            add constraint scores_non_negative_counts_chk
            check (
                coalesce(correct_answers, 0) >= 0 and
                coalesce(total_questions, 0) >= 0 and
                coalesce(total_mistakes, 0) >= 0 and
                coalesce(hints_remaining, 0) >= 0 and
                coalesce(total_hints, 0) >= 0 and
                coalesce(used_hints_count, 0) >= 0 and
                coalesce(time_reward, 0) >= 0 and
                coalesce(avg_answer_ms, 0) >= 0 and
                coalesce(avg_perfect_answer_ms, 0) >= 0 and
                coalesce(perfect_answer_count, 0) >= 0 and
                coalesce(max_combo_reached, 0) >= 0 and
                coalesce(combo_total_bonus, 0) >= 0
            ) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'scores_achievements_type_chk' and conrelid = 'public.scores'::regclass
    ) then
        alter table public.scores
            add constraint scores_achievements_type_chk
            check (achievements is null or jsonb_typeof(achievements) = 'array') not valid;
    end if;
end $$;

-- Enable Row Level Security (RLS)
alter table public.scores enable row level security;

drop policy if exists "Allow Anonymous Select on Scores" on public.scores;
drop policy if exists "Allow Anonymous Insert on Scores" on public.scores;

-- Policy: Allow everyone (Anon) to read scores (for the leaderboard display)
create policy "Allow Anonymous Select on Scores"
on public.scores for select
to anon
using (true);

-- Policy: Restrict anonymous inserts to valid leaderboard records only
create policy "Allow Anonymous Insert on Scores"
on public.scores for insert
to anon
with check (
    completed is true
    and char_length(btrim(player_name)) between 1 and 10
    and score between 0 and 2000000
    and difficulty in ('easy','normal','hard')
    and (mode is null or mode in ('ranking','practice','replay'))
    and (play_mode is null or play_mode in ('classic','survival','replay'))
    and coalesce(correct_answers, 0) >= 0
    and coalesce(total_questions, 0) >= 0
    and coalesce(total_mistakes, 0) >= 0
    and coalesce(hints_remaining, 0) >= 0
    and coalesce(total_hints, 0) >= 0
    and coalesce(used_hints_count, 0) >= 0
    and coalesce(time_reward, 0) >= 0
    and coalesce(avg_answer_ms, 0) >= 0
    and coalesce(avg_perfect_answer_ms, 0) >= 0
    and coalesce(perfect_answer_count, 0) >= 0
    and coalesce(max_combo_reached, 0) >= 0
    and coalesce(combo_total_bonus, 0) >= 0
    and (project_tag is null or project_tag = 'bible-challenge-prod')
    and (achievements is null or jsonb_typeof(achievements) = 'array')
    and (question_snapshot is null or pg_column_size(question_snapshot) <= 131072)
    and coalesce(is_seed, false) in (true, false)
);


-- ==========================================
-- Table: achv_runs
-- Stores telemetry for achievements and game balancing.
-- ==========================================

create table if not exists public.achv_runs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default now(),
    
    -- Telemetry Data
    metrics jsonb,      -- { answered, accuracy, longestStreak, wrongCount, avgMs ... }
    achievements jsonb, -- { ids: [], count: 0 }
    
    -- Metadata
    mode text,
    project_tag text default 'bible-challenge-prod',
    
    -- Linkage
    score_id uuid references public.scores(id) on delete set null
);

-- Backward-compatible migration: older environments may miss achv_runs columns
alter table if exists public.achv_runs
    add column if not exists metrics jsonb;

alter table if exists public.achv_runs
    add column if not exists achievements jsonb;

alter table if exists public.achv_runs
    add column if not exists mode text;

alter table if exists public.achv_runs
    add column if not exists project_tag text default 'bible-challenge-prod';

alter table if exists public.achv_runs
    add column if not exists score_id uuid;

-- Index for fetching recent runs for balancing
create index if not exists achv_runs_created_at_idx on public.achv_runs (created_at desc);
create index if not exists achv_runs_project_tag_idx on public.achv_runs (project_tag);

-- Enable Row Level Security
alter table public.achv_runs enable row level security;

drop policy if exists "Allow Anonymous Insert on Runs" on public.achv_runs;
drop policy if exists "Allow Anonymous Select on Runs" on public.achv_runs;
drop policy if exists "Allow Anonymous Update on Runs" on public.achv_runs;

-- Policy: Allow Anon to insert runs (Telemetry submission)
create policy "Allow Anonymous Insert on Runs"
on public.achv_runs for insert
to anon
with check (
    (project_tag is null or project_tag = 'bible-challenge-prod')
    and (mode is null or mode in ('classic','survival','replay','equip'))
    and (metrics is null or jsonb_typeof(metrics) = 'object')
    and (achievements is null or jsonb_typeof(achievements) in ('array','object'))
    and (metrics is null or pg_column_size(metrics) <= 65536)
    and (achievements is null or pg_column_size(achievements) <= 32768)
);

-- Policy: Allow Anon to select runs (For 'rebalanceTiers' logic & linking)
create policy "Allow Anonymous Select on Runs"
on public.achv_runs for select
to anon
using (true);

-- Policy: Allow Anon to update runs (For 'linkLatestAchievementRunToScore' logic)
-- Restricts updates to rows where score_id is currently NULL to prevent overwriting.
create policy "Allow Anonymous Update on Runs"
on public.achv_runs for update
to anon
using (
    score_id is null
    and (project_tag is null or project_tag = 'bible-challenge-prod')
)
with check (
    score_id is not null
    and (project_tag is null or project_tag = 'bible-challenge-prod')
);

-- ==========================================
-- Summary
-- ==========================================
-- Tables created: scores, achv_runs
-- Indexes created: Performance optimization for sorting and filtering
-- RLS Policies: Configured for public anonymous access with strict validation checks
