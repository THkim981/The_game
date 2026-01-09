-- D1 migration: add nickname to anon ranking entries

ALTER TABLE anon_users ADD COLUMN nickname TEXT;
