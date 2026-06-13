#!/usr/bin/env bash
#
# facilityops-setup.sh
# One-shot setup for the FacilityOps repo hand-off to Claude Code.
#
# What it does (all deterministic, safe to re-run):
#   - ensures the repo + docs dir exist
#   - verifies the seed files (CLAUDE.md, prototype) are real, not placeholders
#   - adds a sensible .gitignore for Expo/Node
#   - commits anything new
#   - optionally adds the GitHub remote + pushes
#   - prints the interactive Claude Code prompt sequence to run by hand
#
# What it deliberately does NOT do:
#   - it does not launch Claude Code with --dangerously-skip-permissions baked in.
#     That flag is left as a conscious, opt-in choice at the bottom. See notes.
#
set -euo pipefail

REPO="${HOME}/projects/facilityops"
GH_REMOTE="git@github.com:dbs-dcem/facilityops.git"   # edit if your repo name differs

say()  { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
warn() { printf '\n\033[1;33m[!]\033[0m %s\n' "$1"; }
die()  { printf '\n\033[1;31m[x]\033[0m %s\n' "$1" >&2; exit 1; }

# --- 1. repo + dirs ---------------------------------------------------------
say "Ensuring repo structure at ${REPO}"
mkdir -p "${REPO}/docs"
cd "${REPO}"
[ -d .git ] || git init -b main

# --- 2. verify seed files are real, not placeholders ------------------------
say "Verifying seed files"
CLAUDE_LINES=$(wc -l < CLAUDE.md 2>/dev/null || echo 0)
PROTO_LINES=$(wc -l < docs/mop-runner-prototype.jsx 2>/dev/null || echo 0)

[ "${CLAUDE_LINES}" -ge 80 ]  || die "CLAUDE.md looks missing/placeholder (${CLAUDE_LINES} lines). Expected ~110."
[ "${PROTO_LINES}" -ge 600 ] || die "prototype looks missing/placeholder (${PROTO_LINES} lines). Expected ~712."
say "Seed files OK  (CLAUDE.md=${CLAUDE_LINES} lines, prototype=${PROTO_LINES} lines)"

# --- 3. .gitignore ----------------------------------------------------------
if [ ! -f .gitignore ]; then
  say "Writing .gitignore"
  cat > .gitignore <<'GITIGNORE'
# deps
node_modules/
.pnp
.pnp.js

# expo
.expo/
.expo-shared/
dist/
web-build/

# native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# env / secrets
.env
.env.*
!.env.example

# logs
npm-debug.*
yarn-debug.*
yarn-error.*
*.log

# os / editor
.DS_Store
*.pem
.idea/
.vscode/*
!.vscode/extensions.json
GITIGNORE
else
  say ".gitignore already present, leaving it"
fi

# --- 4. commit any changes --------------------------------------------------
if [ -n "$(git status --porcelain)" ]; then
  say "Committing changes"
  git add .
  git commit -m "Add .gitignore; verify seed files"
else
  say "Nothing new to commit"
fi

# --- 5. optional: GitHub remote + push --------------------------------------
if git remote | grep -q '^origin$'; then
  say "Remote 'origin' already configured"
else
  warn "No 'origin' remote set."
  printf '    To add it and push, run:\n'
  printf '      git remote add origin %s\n' "${GH_REMOTE}"
  printf '      git push -u origin main\n'
fi

# --- 6. print the interactive Claude Code prompt sequence -------------------
cat <<'GUIDE'

============================================================
 NEXT: drive Claude Code interactively (review between steps)
============================================================

Start it in this directory:

    cd ~/projects/facilityops
    claude

It auto-reads CLAUDE.md on launch. Then feed these prompts ONE AT A TIME,
checking the result of each before sending the next:

[1] Read CLAUDE.md and docs/mop-runner-prototype.jsx in full. The prototype is a
    web React UX reference, not a skeleton — we're building React Native + Expo +
    TypeScript. Don't write code yet. Give me a short plan for tasks 1–5 from the
    "First Claude Code tasks" list, flag any decisions you need, and wait for go-ahead.

[2] Go ahead with task 1 only: scaffold the Expo + TypeScript app and set up
    navigation for Home → Runner → Done. Use Expo Router if idiomatic. Stop after
    scaffolding so I can confirm it boots before we add screens.

[3] Task 2: define the TypeScript types from the data model sketch in CLAUDE.md.
    Put them in a types module. No UI yet.

[4] Task 3: build the maintenance Home — catalog list, by-system/by-interval toggle,
    and due/overdue status logic. Seed it with the prototype's PM catalog. Idiomatic
    React Native, not a port of the web inline styles.

[5] Tasks 4 & 5: build the Runner with the four checkpoint components + hard-checkpoint
    gating, then the Done/audit-trail screen, and wire completion to reset the task
    interval and return Home.

Tip: after each task, tell it "commit this with a clear message" so you can roll back.

------------------------------------------------------------
 About --dangerously-skip-permissions
------------------------------------------------------------
This flag lets Claude Code write/delete files and run shell commands with NO prompt.
It's reasonable ONLY because this is an empty greenfield repo. It is intentionally
NOT baked into this script — type it deliberately if/when you want it:

    claude --dangerously-skip-permissions

Once the repo has real code (or any time you're in a directory with things worth
keeping), prefer plain `claude` and approve actions as they come.
============================================================

GUIDE

say "Setup complete."
