#!/usr/bin/env bash
# Vercel "Ignored Build Step" (wired up in vercel.json's ignoreCommand).
# Exit 0 = skip this deploy, anything else = build it.
#
# Skips a deploy whose changes are all planning/docs/agent tooling: none of
# it ships, but every deploy gets a new build id, which would put the
# "nieuwe versie" update banner in front of everyone with an open page for a
# change they can't see (see src/pages/version.json.ts).
#
# Deliberately a list of what to IGNORE rather than what to build: a folder
# missing from this list only costs an unneeded deploy, whereas a folder
# missing from an allowlist would silently skip one that was needed.
#
# Compared against the last successfully deployed commit, not HEAD^: a push
# of several commits whose last one only touches docs must still deploy the
# code in the ones before it. If that commit isn't in Vercel's shallow
# clone, git diff exits 128 and the deploy goes ahead — failing towards
# building, never towards skipping.
set -u

base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

git diff --quiet "$base" HEAD -- . \
  ':(exclude)_bmad' \
  ':(exclude)_bmad-output' \
  ':(exclude)design' \
  ':(exclude).agents' \
  ':(exclude).claude' \
  ':(exclude)AGENTS.md' \
  ':(exclude)SETUP.md' \
  ':(exclude)skills-lock.json' \
  ':(exclude)migrations/README.md'
status=$?

if [ "$status" -eq 0 ]; then
  echo "Only docs/planning changed since $base — skipping deploy."
else
  echo "Deployable changes since $base (git diff exit $status) — building."
fi
exit "$status"
