import { buildPushHTTPRequest } from '@pushforge/builder';
import { getSql } from './db';

// PushForge VAPID wrapper + 404/410 subscription cleanup (AD-4, story 8).
//
// `VAPID_PRIVATE_KEY` must hold the JWK private key as PushForge's own CLI
// prints it (`npx @pushforge/builder vapid` -> "Private Key (JWK):" line,
// a single-line JSON string) -- PushForge's `buildPushHTTPRequest` verifies
// and signs with Web Crypto directly against that JWK, it does not accept
// the raw base64 keypair format the `web-push` npm package's
// `generate-vapid-keys` produces. `privateJWK` is typed `JsonWebKey | string`
// so the env var's JSON string is passed straight through, unparsed.
const PUSH_CONTACT = 'mailto:noreply@moapmoap.app';

type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Fans out a Web Push notification to every stored subscription for
 * `tripSlug`, one HTTP request per subscription (not a batch API — each
 * subscription is its own push-service endpoint). Never throws: a missing
 * VAPID key or an individual send failure is logged and otherwise
 * swallowed, so a fan-out problem can never fail the admin toggle response
 * that calls this (see admin/toggle.ts). A 404/410 from the push service
 * deletes that subscription row -- the only removal path (AD-4).
 */
export async function sendChapterUnlockedPush(
  tripSlug: string,
  chapterTitle: string,
): Promise<void> {
  const privateJWK = process.env.VAPID_PRIVATE_KEY;
  if (!privateJWK?.trim()) {
    console.error('sendChapterUnlockedPush: VAPID_PRIVATE_KEY is not set; skipping push fan-out.');
    return;
  }

  let rows: StoredSubscription[];
  try {
    const sql = getSql();
    rows = (await sql`
      SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE trip_slug = ${tripSlug}
    `) as StoredSubscription[];
  } catch (err) {
    // Matches this function's own "never throws" contract (see doc comment
    // above) -- a DB read failure here must not propagate any differently
    // than an individual send failure does below.
    console.error('sendChapterUnlockedPush: failed to read subscriptions', err);
    return;
  }

  await Promise.all(
    rows.map((row) => sendToSubscription(privateJWK, tripSlug, chapterTitle, row)),
  );
}

async function sendToSubscription(
  privateJWK: string,
  tripSlug: string,
  chapterTitle: string,
  row: StoredSubscription,
): Promise<void> {
  try {
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK,
      subscription: {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      message: {
        // Notification title/body only -- never state (AD-4). The service
        // worker's `push` handler reads `tripSlug` from this payload solely
        // to know which client to focus/open and which trip to re-fetch.
        payload: {
          title: 'Nieuwe update beschikbaar!',
          body: chapterTitle,
          tripSlug,
        },
        adminContact: PUSH_CONTACT,
      },
    });

    // `admin/toggle.ts` awaits the whole fan-out before responding (see its
    // own comment on why) -- a bounded timeout keeps one slow/unresponsive
    // push-service endpoint from stalling that response indefinitely.
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 404 || response.status === 410) {
      await deleteSubscription(row.endpoint);
      return;
    }

    if (!response.ok) {
      console.error(
        `sendChapterUnlockedPush: push service responded ${response.status} for endpoint ${row.endpoint}`,
      );
    }
  } catch (err) {
    console.error('sendChapterUnlockedPush: failed to send push', err);
  }
}

async function deleteSubscription(endpoint: string): Promise<void> {
  try {
    const sql = getSql();
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
  } catch (err) {
    console.error('sendChapterUnlockedPush: failed to delete stale subscription', err);
  }
}
