# Deferred Work

<!-- Append-only. One entry per deferred goal. Do not modify or delete existing entries. -->

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: DB migration runner implementation (`scripts/migrate.mjs`) — transactional `Pool`/`pg`-based apply, `_migrations` bootstrap, prod-migration verification.
  evidence: Split from story 1's scaffold spec to fit the token scope target after code-review corrections (transactional-DDL fix, ledger-bootstrap ownership, prod-apply path) grew the spec substantially. The convention itself (numbered SQL files, transactional apply, `_migrations` ledger, manual prod step) stays documented in story 1's `migrations/README.md`. Only the runner script's implementation is deferred — independently shippable/testable (`pnpm migrate` against a scratch DB) and doesn't block story 1's own build/dev/typecheck acceptance criteria. Must land before whichever later story (3, 5, 8, or 9) first needs a real table.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `public/manifest.json` isn't functional yet — its `icons` reference `/icons/icon-192.png`/`icon-512.png`, neither of which exist, and its `start_url: "/"` points at a route no page currently serves.
  evidence: Surfaced by review of story 1's diff. Expected and harmless today (the spec explicitly scoped the manifest as "minimal valid, not yet linked from any page" — story 7 wires it up for real per the Structural Seed), but worth an explicit note so story 7 doesn't have to rediscover both gaps from scratch: it needs real icon assets and either a working root route or a corrected `start_url`.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `src/content.config.ts`'s `generateId` casts `data.slug` without validating it exists/is a non-empty string first, and nothing detects two trip files resolving to the same slug.
  evidence: Surfaced by edge-case review of story 1's diff. Not reachable today — `src/content/trips/` has no JSON files yet — so nothing to break, but a malformed or colliding slug in a real content file (story 2's single entry, or story 10's second trip) would currently fail with a confusing loader-level error instead of a clear message. Worth hardening when story 2 or 10 lands.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `src/content.config.ts` has no cross-validation between a chapter's `kind` ('cinematic'|'knap') and its `svgVariant` — a 'knap' chapter could be assigned a cinematic-only `svgVariant` value with no schema error.
  evidence: Surfaced by edge-case review of story 1's diff. AD-7 doesn't explicitly mandate a strict kind/svgVariant pairing, so this needs a product decision (should it be enforced?) before adding the constraint — relevant once story 2 authors real content and picks real `svgVariant` values.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: No linter/formatter (ESLint/Prettier) or pre-commit hook is set up; no root-level `README.md` exists as a human-facing entry point (AGENTS.md is agent-scoped, SETUP.md covers only manual cloud provisioning).
  evidence: Surfaced by review of story 1's diff. Reasonable tooling/docs improvements, explicitly out of this story's scope (the approved spec didn't call for either) — worth picking up whenever convenient, not blocking any later story.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `SETUP.md`'s secret-generation steps assume `openssl` is on PATH, with no fallback noted for a stock Windows shell without Git Bash/WSL.
  evidence: Surfaced by review of story 1's diff. Real onboarding gap given the project owner is on Windows, but low urgency since `SETUP.md` is manual/one-time documentation, not executed code — worth a one-line fallback note whenever someone next touches that file (e.g. alongside story 4 or 8, which are the first to actually need those secrets).

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/2-content-config-data-model-ameland-content.md`
  summary: `svgVariant`'s "knap" enum values (`knap-vrijdag`, `knap-zondag`) have no documented rendering behavior anywhere — `BUILD_BRIEF.md`'s animation-systems section only describes the three cinematic treatments — and nothing in the schema ties a given `svgVariant` value to the chapter `id`/`kind` it's meant for (a future trip's content could pair `knap-vrijdag` with an unrelated chapter with no schema error), overlapping the kind/svgVariant cross-validation gap already noted for story 1.
  evidence: Surfaced by blind-hunter review of story 2's real content authoring (`ameland-weekend.json`), which is the first content entry to actually pick concrete `svgVariant` values. Doesn't block story 2 (the values chosen match the mockup's existing per-chapter treatments 1:1 by convention) but story 3, which implements the actual rendering, will need either documented semantics for each "knap" variant or a decision on whether to enforce the id/kind/svgVariant pairing in the schema.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/2-content-config-data-model-ameland-content.md`
  summary: `TripContent` has no structured trip-end date/time — only `startDate` is modeled, and the actual return time ("16:00 — Boot terug naar het vasteland") only exists as free text inside `zondag.description`.
  evidence: Surfaced by blind-hunter review of story 2's real content authoring. Not a blocker for any current story, but if a future story needs to know when the trip ends (stopping the countdown, archiving the page, showing a "trip has ended" state), there's currently no field to source that from other than parsing prose — would need a schema change (`endDate` or similar) rather than a content-only fix.
