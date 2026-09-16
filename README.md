# AI Software Engineering Pipeline

A reference implementation of:

```text
GitHub Issue
     ↓
Planner Agent
     ↓
Implementation Plan
     ↓
Independent Reviewer Agent
     ↓
Final Plan
     ↓
Implementation Agent
     ↓
Pre-execution Security Review
     ↓
Tests with secret-like env vars removed
     ↓
Final Security Review
     ↓
Pull Request
```

## Why this design

The independent reviewer is a **fresh model request**, not a continuation of the planner conversation. It receives the original requirement, repository snapshot, and proposed plan, reducing self-review anchoring.

The implementation agent returns bounded full-file text changes rather than arbitrary shell commands. The orchestrator validates write paths, includes new/untracked files in the diff, performs a security review before executing generated code, runs tests with secret-like environment variables removed, then performs a final security review before creating a PR.

## Requirements

- Node.js 20+ (no runtime npm dependencies)
- Git
- A GitHub repository checked out locally
- `OPENAI_API_KEY`
- `GITHUB_TOKEN` with repository contents + pull request write access

The pipeline uses OpenAI's Responses API. The model can be changed with `OPENAI_MODEL`.

## Setup

```bash
cp .env.example .env
```

Export the variables in `.env` through your preferred environment loader/shell. Required values:

```bash
OPENAI_API_KEY=...
GITHUB_TOKEN=...
GITHUB_REPOSITORY=owner/repo
OPENAI_MODEL=gpt-5.3-codex
```

## Run locally

Start with dry-run mode:

```bash
DRY_RUN=true npm run pipeline -- --issue 123
```

Artifacts are written to:

```text
.ai-pipeline/runs/issue-123-.../
├── 00-requirement.md
├── 01-initial-plan.md
├── 02-independent-review.md
├── 03-final-plan.md
└── 04-implementation-response.txt
```

For a real implementation + PR:

```bash
DRY_RUN=false npm run pipeline -- --issue 123
```

The repository must have a clean working tree before the run.

## GitHub Actions

Two workflows are included:

- **CI** — runs `npm test` on pull requests and pushes to `main`.
- **AI Engineering Pipeline** — manually triggered with an issue number and a `dry_run` switch.

Create an Actions secret:

```text
OPENAI_API_KEY
```

The AI workflow automatically receives GitHub's scoped `GITHUB_TOKEN`.

For the first run, keep `dry_run=true` and inspect the generated planning output before enabling implementation.

## Agent responsibilities

### Planner

- inspects repository context
- creates a minimal implementation plan
- separates verified facts from assumptions

### Independent reviewer

- runs in a separate model request
- treats the plan as untrusted
- focuses on material issues only
- avoids overthinking/nitpicking

### Finalizer

- accepts only supported review findings
- produces the final plan

### Implementer

- returns complete UTF-8 file contents in JSON
- cannot choose the test command
- cannot write `.git`, `.env`, or `.env.*` files
- does not directly issue shell commands

### Security reviewer

- reviews generated code before it is executed
- reviews the final git diff again before PR creation
- blocks critical/major security regressions

## Safety properties

- clean-working-tree requirement
- new branch for every implementation run
- path traversal protection
- `.git`, `.env`, and `.env.*` write protection
- untracked generated files included in security review
- pre-execution security gate before tests
- secret-like environment variables stripped from the test subprocess
- tests gate PR creation
- final security review gates PR creation
- repository snapshots have explicit context limits
- dry-run mode enabled by default in the GitHub Actions UI

## Important security limitation

This is **not a full sandbox**. When `DRY_RUN=false`, model-generated source code is eventually executed by the configured test command. The pipeline reduces risk by reviewing the diff first and removing secret-like environment variables, but generated code can still use the runner's filesystem and network according to the host's permissions.

For sensitive or production repositories, run generated code inside a stronger sandbox/container with restricted network egress and filesystem permissions, and keep a human approval gate before execution or deployment.

## Limitations of v0.1

- Repository context is selected heuristically and may omit a relevant file in very large repositories.
- Implementation uses complete file replacement rather than AST-aware patches.
- Security findings block the PR rather than automatically starting a remediation loop.
- Planner and reviewer are independent API calls but use the same configured model by default.
- Secret-name filtering is defense-in-depth, not a replacement for execution sandboxing.

## Next improvements

1. Add semantic repository retrieval instead of heuristic context selection.
2. Use different models or configurations for planner/reviewer diversity.
3. Add a bounded remediation loop after failed tests/security review.
4. Add MCP tools with read-only scopes for planner/reviewer and write scopes only for implementer.
5. Add OpenTelemetry traces and per-stage token/cost metrics.
6. Add policy files for allowed/blocked repository paths.
7. Run generated code in a network-restricted sandbox.
8. Add human approval before generated code execution for sensitive repositories.
