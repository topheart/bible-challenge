-- Supabase Setup Script for Bible Challenge
-- Run this in the Supabase SQL Editor to initialize your database.

-- 1. Enable UUID extension (usually enabled by default, but good to be sure)
create extension if not exists "uuid-ossp";

-- ==========================================
-- Table: scores
-- Stores game results for the leaderboard.
-- ==========================================

create table if not exists public.scores (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default now(),
    
    -- Core Player Info
    player_name text not null,
    score integer not null,
    difficulty text not null, -- 'easy', 'normal', 'hard'
    mode text default 'classic', -- 'classic' or 'survival'
    
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
    
    -- Replay / Snapshot Data (Heavy)
    question_snapshot jsonb, 
    
    -- Environment Layout
    project_tag text default 'bible-challenge-prod'
);

-- Index for faster leaderboard queries (sorting by score descending)
create index if not exists scores_score_idx on public.scores (score desc);
create index if not exists scores_project_tag_idx on public.scores (project_tag);

-- Enable Row Level Security (RLS)
alter table public.scores enable row level security;

-- Policy: Allow everyone (Anon) to read scores (for the leaderboard display)
create policy "Allow Anonymous Select on Scores"
on public.scores for select
to anon
using (true);

-- Policy: Allow everyone to insert scores (Post-game submission)
create policy "Allow Anonymous Insert on Scores"
on public.scores for insert
to anon
with check (true);


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

-- Index for fetching recent runs for balancing
create index if not exists achv_runs_created_at_idx on public.achv_runs (created_at desc);
create index if not exists achv_runs_project_tag_idx on public.achv_runs (project_tag);

-- Enable Row Level Security
alter table public.achv_runs enable row level security;

-- Policy: Allow Anon to insert runs (Telemetry submission)
create policy "Allow Anonymous Insert on Runs"
on public.achv_runs for insert
to anon
with check (true);

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
using (score_id is null)
with check (score_id is not null);

-- ==========================================
-- Summary
-- ==========================================
-- Tables created: scores, achv_runs
-- Indexes created: Performance optimization for sorting and filtering
-- RLS Policies: Configured for public anonymous access (Standard for client-side only games)
