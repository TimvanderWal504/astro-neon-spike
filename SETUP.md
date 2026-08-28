# Setup

Manual, one-time provisioning steps a human has to do interactively (account
login, cloud resource creation). Nothing in this file is automated by the
codebase — see `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
for why.

> **Update (verified 2026-08-25):** steps 2-6 below were completed end-to-end
> by an agent using the `vercel` CLI (see `AGENTS.md` § "Running and
> verifying" for the auth path — one human-approved `vercel login` device-code flow, then
> everything else was scriptable: `vercel link`, `vercel env ls`, `vercel
> deploy --prod --yes`). Manual dashboard steps below remain valid if you'd
> rather do it by hand, or don't have CLI access in your agent's session.

## 1. Confirm the local git history is pushed

This scaffold already ran `git init` and made an initial commit locally (see
`git log`). Push it to a remote (GitHub/GitLab/Bitbucket) that Vercel can
import from, e.g.:

```
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Create the Vercel project and deploy it

1. Sign in (or create an account) at https://vercel.com.
2. From the Vercel dashboard, click **Add New… → Project**, and import the
   repo pushed in step 1.
3. Vercel should auto-detect the **Astro** preset with Root Directory `./`.
   Leave the build command / output directory at their Astro defaults.
4. The import screen shows env vars detected from `.env.example` — leave
   them blank for now and click **Deploy**. The build doesn't need any of
   them: `src/lib/db.ts` only reads `DATABASE_URL` lazily inside a function,
   never at module/build scope, and the stub API routes don't call it at
   all. You'll add real values and redeploy in steps 3-5.
   (The Neon Marketplace integration in step 3 lives under this project's
   **Storage** tab, so the project has to exist before you can add it —
   that's why deploy comes before Neon here, not after.)

## 3. Add Neon via the Vercel Marketplace integration

1. In the Vercel project's dashboard, go to **Storage → Browse Marketplace**
   (or **Integrations**) and add **Neon Postgres**.
2. During setup, create **two branches**: `dev` and `prod` (AD-9 — one Vercel
   project, two Neon branches, no separate staging environment).
3. The integration will offer to inject `DATABASE_URL` (and related Neon env
   vars) into your Vercel project automatically, scoped per environment
   (Production → `prod` branch, Preview/Development → `dev` branch). Confirm
   it did so under **Project Settings → Environment Variables**.
4. Copy the `dev` branch's connection string into your local `.env` as
   `DATABASE_URL` (see step 5).

## 4. Pin the Node.js version in Vercel

1. Go to **Project Settings → General → Node.js Version**.
2. Set it to match `.nvmrc` at the repo root (currently `24.19.0` — Node 24
   is the current Active LTS and Vercel's default at time of writing; if this
   has drifted, re-check `.nvmrc` first).

## 5. Generate secrets and populate env vars

Copy `.env.example` to `.env` locally:

```
cp .env.example .env
```

Generate each secret with the command noted next to it in `.env.example`,
then set the value in **both** places: your local `.env` and Vercel's
**Project Settings → Environment Variables**.

| Var | Generate with | Scope in Vercel |
| --- | --- | --- |
| `DATABASE_URL` | copied from the Neon integration (step 3) | Production = prod branch, Preview/Dev = dev branch |
| `ADMIN_PASSCODE` | `openssl rand -base64 32` | all environments |
| `COOKIE_SIGNING_SECRET` | `openssl rand -base64 32` | all environments |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `pnpm dlx web-push generate-vapid-keys` (generates both at once) | all environments |

Use a **different** `ADMIN_PASSCODE` value for local `.env` vs. production if
you want separate access; otherwise reuse the same value everywhere for
simplicity — it's the organizer's own passcode either way.

## 6. Redeploy with the real env vars

Vercel only picks up new/changed env vars on a fresh deploy, not retroactively
on the one from step 2. Trigger a redeploy (**Deployments → ⋯ → Redeploy** in
the dashboard, or push a new commit) and confirm the secrets from step 5 show
up as available in the deployed function's environment.

## Verification checklist

- [x] Vercel project exists, connected to this repo, first deploy succeeded.
- [x] Neon integration added (via Marketplace — `STORAGE_*` env vars present).
- [x] Node version set in Vercel (`24.x`, matches `.nvmrc`'s major).
- [x] All four secrets (`DATABASE_URL`, `ADMIN_PASSCODE`,
      `COOKIE_SIGNING_SECRET`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`) are set
      in Vercel's dashboard. Local `.env.development` has `DATABASE_URL` only
      — the other three aren't consumed by any code yet (stories 4/8), so
      they weren't pulled locally.
- [x] Redeployed after the secrets were set — confirmed live at
      https://astro-neon-spike.vercel.app (`/manifest.json` → 200,
      `/api/trip/test` → 501 as designed, 2026-08-25).
