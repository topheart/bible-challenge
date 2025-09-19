// Copy this file to bible-challenge/leaderboard-config.js and fill in your Supabase project details.
// WARNING: Exposing anonKey in a public repo is acceptable for client-side reads/writes if Row Level Security (RLS) policies are properly configured.
// Create a table named `scores` with these columns (recommended):
// id: uuid (default uuid_generate_v4()), primary key
// created_at: timestamp with time zone, default now()
// player_name: text
// score: integer
// difficulty: text (enum-friendly: 'easy' | 'normal' | 'hard')
// date: text (optional display string)
// time: text (optional display string)
// completed: boolean
// correct_answers: integer
// total_questions: integer
// total_mistakes: integer
// level_results: jsonb
// range: text
// rarity: text
// mode: text
// testament: text
// custom_books: jsonb
// hints_remaining: integer
// total_hints: integer
// show_time_reward: boolean
// time_reward: integer
// used_hints_count: integer
// closing_verse: text
// closing_verse_ref: text
// question_snapshot: jsonb (optional; large)
// project_tag: text (optional; if you want to segregate environments)
// allowReplaySaves: boolean (optional; default false) — allow "same questions replay" runs to be saved

window.SUPABASE_CONFIG = {
  url: "https://kkbwoahtwfdirqsgyqda.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrYndvYWh0d2ZkaXJxc2d5cWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NDQzODQsImV4cCI6MjA3MTIyMDM4NH0.znmpO0QUO9g4pyWQJ8iKssUhZUzkmNxIPBeOxJPIJGo",
  table: "scores",
  // Optional flags
  projectTag: "bible-challenge-prod",
  storeSnapshot: true,
  // If true, "同題重玩" runs can be saved to the leaderboard (tagged as mode: 'replay')
  allowReplaySaves: true,
  // Supabase-js client options (recommended: don't persist session on public client)
  options: { auth: { persistSession: false } },
  // Achievements telemetry table (for sampling last 100 runs)
  achvRunsTable: "achv_runs"
};
