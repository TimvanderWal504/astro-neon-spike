-- 0004_notifications: notifications (log of every push sent, shown on the
-- public page as small blocks). Written by src/lib/push.ts right before a
-- fan-out. `chapter_id` is set only for chapter-unlock pushes, so the public
-- API can hide a notification again if its chapter is re-locked (the body
-- is the chapter title, which must not outlive the unlock).
CREATE TABLE notifications (
  id bigserial PRIMARY KEY,
  trip_slug text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  chapter_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_trip_slug_created_at_idx ON notifications (trip_slug, created_at DESC);
