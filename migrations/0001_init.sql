-- 0001_init: chapter_unlocks (AD-7 live unlock state).
--
-- Rows are created only on first admin-toggle (story 5) — a chapter absent
-- from this table reads as locked. Never seed rows here; the table starts
-- and stays empty until an admin actually toggles a chapter.
CREATE TABLE chapter_unlocks (
  trip_slug text NOT NULL,
  chapter_id text NOT NULL,
  unlocked boolean NOT NULL,
  PRIMARY KEY (trip_slug, chapter_id)
);
