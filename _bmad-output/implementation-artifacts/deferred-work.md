# Deferred Work

<!-- Append-only. One entry per deferred goal. Do not modify or delete existing entries. -->

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: DB migration runner implementation (`scripts/migrate.mjs`) — transactional `Pool`/`pg`-based apply, `_migrations` bootstrap, prod-migration verification.
  evidence: Split from story 1's scaffold spec to fit the token scope target after code-review corrections (transactional-DDL fix, ledger-bootstrap ownership, prod-apply path) grew the spec substantially. The convention itself (numbered SQL files, transactional apply, `_migrations` ledger, manual prod step) stays documented in story 1's `migrations/README.md`. Only the runner script's implementation is deferred — independently shippable/testable (`pnpm migrate` against a scratch DB) and doesn't block story 1's own build/dev/typecheck acceptance criteria. Must land before whichever later story (3, 5, 8, or 9) first needs a real table.
