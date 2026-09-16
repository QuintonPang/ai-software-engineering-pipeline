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
Tests
     ↓
Security Reviewer
     ↓
Pull Request
```

## Why this design

The independent reviewer is a **fresh model request**, not a continuation of the planner conversation. It receives the original requirement, repository snapshot, and proposed plan, reducing self-review anchoring.

The implementation agent cannot execute arbitrary commands. It returns bounded full-file text changes which the orchestrator validates before writing. Tests run locally, then a separate security reviewer evaluates the diff. A PR is created only if tests pass and the security review does not block.

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

The included workflow can be triggered manually from **Actions → AI Engineering Pipeline → Run workflow**.

Create an Actions secret:

```text
OPENAI_API_KEY
```

The workflow automatically receives GitHub's scoped `GITHUB_TOKEN`.

For the first run, leave `dry_run=true` and inspect the planning artifacts in local runs. Note that run artifacts are intentionally gitignored; you can add an upload-artifact step if your organization permits storing model outputs in Actions artifacts.

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
- cannot directly execute shell commands
- cannot write `.git` or `.env`

### Security reviewer

- reviews the actual git diff
- blocks PR creation for critical/major security regressions

## Safety properties

- clean-working-tree requirement
- new branch for every implementation run
- path traversal protection
- `.git` and `.env` write protection
- no model-generated shell execution
- tests gate PR creation
- security review gates PR creation
- repository snapshots have explicit context limits

## Limitations of v0.1

- The repository snapshot is selected heuristically and may omit a relevant file in very large repositories.
- The implementation format uses complete file replacement rather than AST-aware patches.
- Security findings block the PR rather than automatically starting a remediation loop.
- The planner/reviewer are independent API calls, but use the same configured model by default.

These are deliberate first-version tradeoffs to keep the system understandable and auditable.

## Next improvements

1. Add semantic repository retrieval instead of heuristic context selection.
2. Use two different models for planner/reviewer diversity.
3. Add a bounded remediation loop after failed tests/security review.
4. Add MCP tools with read-only scopes for planner/reviewer and write scopes only for implementer.
5. Add OpenTelemetry traces and per-stage token/cost metrics.
6. Add policy files for allowed/blocked repository paths.
7. Add human approval before push/PR for sensitive repositories.
