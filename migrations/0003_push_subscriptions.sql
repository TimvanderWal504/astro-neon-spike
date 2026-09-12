-- 0003_push_subscriptions: push_subscriptions (AD-4/AD-7 push subscription
-- storage). Rows are created via POST /api/push/subscribe (the public write
-- exception, AD-3), upserted on `endpoint` so re-subscribing the same
-- endpoint never duplicates a row. Removed only when a push to that endpoint
-- 404s/410s (story 8's fan-out routine, src/lib/push.ts) -- no separate
-- cleanup job, no manual unsubscribe route.
CREATE TABLE push_subscriptions (
  endpoint text PRIMARY KEY,
  trip_slug text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_trip_slug_idx ON push_subscriptions (trip_slug);
