-- 0004_notifications: notifications (log of admin-sent push notifications,
-- shown on the public page as small blocks). Written by src/lib/push.ts
-- (sendCustomNotification) right before a fan-out.
CREATE TABLE notifications (
  id bigserial PRIMARY KEY,
  trip_slug text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_trip_slug_created_at_idx ON notifications (trip_slug, created_at DESC);
