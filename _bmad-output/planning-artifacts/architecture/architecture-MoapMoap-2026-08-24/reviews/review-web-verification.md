# Web-Verification Review — ARCHITECTURE-SPINE.md

**Reviewed:** ARCHITECTURE-SPINE.md (Ameland Vriendenweekend PWA)
**Review date:** 2026-08-24
**Reviewer role:** Independent stale-training-data check via live web search
**Scope:** Stack table + AD-8/AD-9 (every claim naming a technology, library, platform, or version)

## Verdict

Two of the five checked claims are materially wrong or outdated as of today (2026-08-24), one has a real, checkable compatibility break that the spine did not catch, and the reasoning behind AD-8 is right in conclusion but wrong/incomplete in its justification. The spine's own self-flagged item (`web-push` staleness) is confirmed accurate, but the spine also asserts "no better-maintained alternative surfaced in research" — that is false; one exists and it would have changed the AD-8 tradeoff.

---

## 1. Astro 6.3.1 as "current stable" — **WRONG (stale-training-data pattern confirmed)**

**Spine claim:** Stack table lists `Astro | 6.3.1`, framed as the current version to build on.

**Finding:** Astro 6.3.1 was a real, valid patch release (published ~May 7, 2026, fixing a local-image 404 bug on non-prerendered pages), but it is **not current**. **Astro 7.0 was released June 22, 2026** — over two months before this spine's date — with a Rust-rewritten compiler, a new Rust Markdown/MDX pipeline, and a Vite 8/Rolldown upgrade. As of 2026-08-24 the ecosystem is already iterating on Astro 7.x (e.g. "What's new in Astro – July 2026" blog post exists).

This is a one-major-version-behind pick presented with no version-currency caveat. It is exactly the pattern this review was commissioned to catch: a plausible, real version number that was current at some point in training/knowledge but has since been superseded.

**Severity: High.** Building against Astro 6 today means starting a new project on an already-superseded major version, and it directly affects finding #2 below (the PWA plugin's peer-dependency ceiling).

**Sources:**
- https://astro.build/blog/astro-7/ (Astro 7.0 announcement, June 22, 2026)
- https://astro-changelog.netlify.app/releases/re_kwdofl76q84tbsva/ (Astro 6.3.1 release notes)
- https://astro.build/blog/whats-new-july-2026/
- https://blog.imseankim.com/astro-7-alpha-vite-8-rust-compiler-default-replaces-go-esbuild-2026/

---

## 2. @vite-pwa/astro v1.2.0 — **REAL VERSION, BUT UNDISCLOSED COMPATIBILITY BREAK WITH THE SPINE'S OWN ASTRO PICK**

**Spine claim:** Stack table lists `@vite-pwa/astro | 1.2.0` alongside `Astro | 6.3.1`, implying the two are meant to work together.

**Finding:** v1.2.0 is a real, currently-published version (last published ~8 months before today, i.e. around late 2025). However, its `package.json` on the `main` branch declares:

```
"peerDependencies": {
  "astro": "^1.6.0 || ^2.0.0 || ^3.0.0 || ^4.0.0 || ^5.0.0",
  "vite-plugin-pwa": "^1.2.0"
}
```

**Astro 6 is not in that range at all**, let alone Astro 7. There is an open upstream issue in the sibling `vite-pwa/vite-plugin-pwa` repo (Feb 2026) specifically about "Support latest Astro releases to avoid manifest generation error," indicating the maintainers were still catching up to newer Astro majors as of this year.

This is exactly the category-(d) failure the task asked me to flag: two individually-real technologies that the spine assumes compose, but whose declared peer ranges do not actually overlap. Installing this combination would either fail a peer-dependency check or silently run on an unsupported combination.

**Severity: High.** This is not a hypothetical — it's a concrete `npm install` failure risk (or a `--force`/`--legacy-peer-deps` footgun) baked into the Stack table as presented, and it compounds finding #1 (the spine also being one Astro major ahead of what the PWA plugin supports even before Astro 7 is considered).

**Sources:**
- https://github.com/vite-pwa/astro/blob/main/package.json (peerDependencies)
- https://github.com/vite-pwa/vite-plugin-pwa/issues/915 ("Support latest Astro releases to avoid manifest generation error")
- https://www.npmjs.com/package/@vite-pwa/astro
- https://github.com/vite-pwa/astro/releases

---

## 3. web-push npm v3.6.7 — **CONFIRMED STALE, BUT "no better-maintained alternative" IS FALSE**

**Spine claim:** Stack table + AD-8 + Deferred section explicitly self-flag `web-push@3.6.7` as stale (~3 years since last publish) and state: *"no better-maintained alternative surfaced in research."*

**Finding, part A (confirmed accurate):** Independent search confirms `web-push` on npm was indeed last published approximately 3 years ago. The spine's self-assessment of staleness is correct — credit where due.

**Finding, part B (the "no alternative" claim does not hold up):** A real, actively maintained, purpose-built alternative exists: **PushForge** (`@pushforge/builder`), described as "a web-push alternative with zero dependencies, built on the Web Crypto API," explicitly supporting **Cloudflare Workers, Vercel Edge, Deno, Bun, and Node.js**. Its own FAQ states: *"Yes, PushForge works perfectly with Vercel Edge Functions."*

This matters architecturally, not just as a nicer dependency: **PushForge's whole value proposition is that it avoids Node's `crypto` module in favor of Web Crypto API**, which is exactly the constraint AD-8 uses to justify pinning all API routes to the Node.js Serverless runtime. Had this alternative surfaced during research, AD-8's stated rationale (*"the `web-push` VAPID library needs Node's `crypto` module, which Edge does not fully support"*) would not necessarily force the Node-runtime decision — a PushForge-based implementation could run on Edge (or either runtime), decoupling the runtime choice from the push-library choice.

To be clear: this does **not** mean AD-8's conclusion (use Node.js Functions) is wrong — see finding #5 below, there's actually a *stronger* independent reason to land there now. But the spine's stated chain of reasoning ("we need Node because web-push needs Node's crypto") is avoidable, and the "no better-maintained alternative surfaced" claim in the Deferred section is factually incorrect as of today.

**Severity: Medium.** Doesn't invalidate the final runtime decision, but the spine oversold its own research completeness and picked a stale, unmaintained library while asserting (incorrectly) that it checked for alternatives.

**Sources:**
- https://www.npmjs.com/package/web-push
- https://socket.dev/npm/package/web-push
- https://pushforge.draphy.org/
- https://github.com/web-push-libs/web-push

---

## 4. Neon Postgres via Vercel Marketplace / "Vercel Postgres deprecated June 2025" — **CONFIRMED ACCURATE**

**Spine claim:** Stack table lists `Neon Postgres | via Vercel Marketplace integration`; AD-9 specifies two Neon branches via "the Vercel Marketplace Neon integration"; the surrounding narrative (per task framing) attributes this to Vercel Postgres being deprecated as a standalone product in June 2025.

**Finding:** This checks out. Vercel officially sunset the standalone Vercel Postgres (and Vercel KV) product, replacing it with Marketplace Storage integrations with automatic provisioning and unified billing — **effective June 9, 2025**, per Vercel's own changelog. All previously-provisioned Vercel Postgres databases had already been transitioned onto Neon's native infrastructure between Q4 2024 and Q1 2025, and new projects since June 2025 must go through the Marketplace integration flow (e.g. "Neon for Vercel" listing). The `@vercel/postgres` SDK still technically works but is no longer actively maintained; Neon's own docs recommend migrating to `@neondatabase/serverless`.

The spine's choice (Neon via Marketplace, two branches for dev/prod) matches current, correct, post-sunset practice.

**Severity: None — verified correct.** No action needed, though it's worth having the team confirm the `dev`/`prod` Neon branches are provisioned through the Marketplace flow (not a legacy `@vercel/postgres` credential) since old projects can still be carrying stale env vars from before the June 2025 cutover.

**Sources:**
- https://vercel.com/changelog (Vercel Postgres/KV sunset notice, effective June 9, 2025)
- https://neon.com/docs/guides/vercel-postgres-transition-guide
- https://neon.com/docs/guides/vercel-managed-integration
- https://vercel.com/marketplace/neon
- https://kuberns.com/blogs/vercel-postgres-dead-what-replaced-it/

---

## 5. Vercel Node.js Serverless Functions vs Edge Functions / Node `crypto` claim — **CONCLUSION RIGHT, JUSTIFICATION OUTDATED AND UNDERSTATED**

**Spine claim (AD-8):** "Prevents: picking Edge runtime and then discovering the `web-push` VAPID library needs Node's `crypto` module, which Edge does not fully support." Rule: run all API routes as Node.js Serverless Functions, never Edge Functions.

**Finding:** The specific technical fact — Edge Runtime does not support Node's native `crypto` module (only `crypto.subtle`/Web Crypto API) — is correct and still true today.

But the framing radically understates how settled this is. As of Vercel's current documentation (page last updated 2026-07-29, i.e. one month before this spine), **Vercel Edge Functions are deprecated outright, for all new projects, independent of any crypto concern**:

> "Edge Functions are deprecated. Do not use them for new projects... Use Vercel Functions with the Node.js runtime instead for improved performance and full API support." — vercel.com/docs/functions/runtimes/edge/edge-functions

Vercel's current terminology has also consolidated: it no longer frames the choice as "Serverless Functions vs. Edge Functions" — it's now unified under **"Vercel Functions,"** with **Node.js as the default runtime** and Fluid Compute as the execution model underneath (shipped ~early 2025, now default for new deployments, offering concurrent request handling and reduced cold starts). "Edge Functions" survives only as the (differently-scoped) runtime for Routing Middleware, which is explicitly called out as unaffected by the deprecation.

Two implications for the spine:
- **AD-8's "Prevents" framing is backwards-looking.** It's written as though Edge is a live, tempting alternative that a crypto gotcha rules out. In reality, Vercel itself now steers everyone away from standalone Edge Functions by default — the crypto/`web-push` issue is a secondary, no-longer-necessary reason to land on a decision Vercel already makes for you.
- **Naming drift:** the spine should say "Vercel Functions (Node.js runtime)" rather than "Node.js Serverless Functions" — the latter is legacy terminology from before the Fluid Compute unification and may confuse an implementer checking current Vercel docs, where "Serverless Functions" as a distinct product name is largely retired.

**Severity: Medium.** The eventual configuration (Node runtime, no Edge) is still correct and arguably now even easier to justify — but AD-8 as written would mislead an implementer into thinking they're making a nuanced tradeoff call, when Vercel has already deprecated the alternative it warns against. Recommend rewriting AD-8's rationale and updating the terminology to match current Vercel docs.

**Sources:**
- https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc (fetched 2026-08-24; "Edge Functions (Deprecated)", last_updated: 2026-07-29)
- https://github.com/vercel/next.js/discussions/51753 ("The edge runtime does not support Node.js 'crypto' module")
- https://vercel.com/blog/introducing-fluid-compute
- https://vercel.com/docs/fluid-compute
- https://vercel.com/docs/fundamentals/what-is-compute

---

## Summary Table

| # | Claim | Verdict | Severity |
| - | ----- | ------- | -------- |
| 1 | Astro 6.3.1 = current stable | **Wrong** — Astro 7.0 shipped June 22, 2026, superseding it | High |
| 2 | @vite-pwa/astro 1.2.0 works with Astro 6.3.1 | **Wrong** — plugin's peerDeps cap at Astro `^5.0.0`; Astro 6/7 unsupported | High |
| 3 | web-push 3.6.7, "no better-maintained alternative" | Staleness confirmed true; "no alternative" claim **false** (PushForge exists) | Medium |
| 4 | Neon via Vercel Marketplace; Vercel Postgres deprecated June 2025 | **Confirmed accurate** (sunset effective June 9, 2025) | None |
| 5 | Node Serverless over Edge because Edge lacks Node `crypto` | Conclusion correct; justification **outdated** — Edge Functions are now deprecated wholesale by Vercel, and terminology ("Serverless Functions") is stale post-Fluid-Compute | Medium |

## Recommended actions for the spine author

1. Re-pin the Stack table to a currently-supported Astro major (5.x, to stay inside `@vite-pwa/astro`'s peer range) **or** confirm with the `vite-pwa/astro` maintainers/issue tracker whether an unreleased/beta build supports Astro 6/7 before committing to Astro 6.3.1.
2. Re-run the "better-maintained alternative" check for the push library — evaluate PushForge (or an equivalent Web-Crypto-API-based library) against `web-push`, since it removes the Node-`crypto` dependency that currently anchors AD-8.
3. Rewrite AD-8's rationale to reflect that Vercel has deprecated standalone Edge Functions outright (as of docs updated 2026-07-29), and update terminology from "Node.js Serverless Functions" to "Vercel Functions (Node.js runtime)" to match current Vercel docs.
4. No change needed for the Neon/Vercel Marketplace Postgres claim — it is accurate as stated.
