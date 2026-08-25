# Setup

Manual, one-time provisioning steps a human has to do interactively (account
login, cloud resource creation). Nothing in this file is automated by the
codebase — see `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
for why.

## 1. Create the Vercel project

1. Sign in (or create an account) at https://vercel.com.
2. From the Vercel dashboard, click **Add New… → Project**.
3. Import this repository from its git host (push it there first if you
   haven't — see step 2 below for the local git state this scaffold already
   has).
4. When prompted for framework preset, Vercel should auto-detect **Astro**.
   Leave the build command / output directory at their Astro defaults.
5. Do **not** deploy yet — finish steps 2-4 first so the required env vars
   exist before the first build runs.

## 2. Confirm the local git history is pushed

This scaffold already ran `git init` and made an initial commit locally (see
`git log`). Push it to a remote (GitHub/GitLab/Bitbucket) that Vercel can
import from, e.g.:

```
git remote add origin <your-repo-url>
git push -u origin main
```

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

## 6. Deploy

Trigger the first deploy (push to the connected branch, or click **Deploy**
in the Vercel dashboard). Confirm the build completes and the env vars from
step 5 show up as available in the deployed function's environment.

## Verification checklist

- [ ] Vercel project exists and is connected to this repo.
- [ ] Neon integration added, with `dev` and `prod` branches.
- [ ] Node version pinned in Vercel settings to match `.nvmrc`.
- [ ] All four secrets (`DATABASE_URL`, `ADMIN_PASSCODE`,
      `COOKIE_SIGNING_SECRET`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`) are set
      in Vercel's dashboard **and** in a local `.env`.
- [ ] First deploy completed successfully.
