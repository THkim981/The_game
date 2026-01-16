-- D1 migration: remove sub-1s 1e100 ranking records
-- Goal: exclude obvious bogus/cheat times (< 1 second) from persisted stats and leaderboard.

-- Keep anon_user row (nickname) but clear invalid score.
UPDATE anon_users
SET best_score = NULL
WHERE best_score IS NOT NULL AND best_score < 1;

-- Clear invalid best-time from profile stats.
UPDATE profile_stats
SET bestTimeTo1e100Seconds = NULL
WHERE bestTimeTo1e100Seconds IS NOT NULL AND bestTimeTo1e100Seconds < 1;
