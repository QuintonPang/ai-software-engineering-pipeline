# AI Engineering Pipeline repository instructions

- Keep the pipeline safe-by-default.
- Models may propose complete text-file replacements, but may not issue arbitrary shell commands.
- Never expose tokens or secrets in prompts, logs, commits, or PR bodies.
- Keep planner/reviewer requests independent: the reviewer is a separate API request with no previous response chain.
- Do not weaken path validation.
- Do not create a PR when tests fail or the security reviewer returns BLOCK.
- Prefer small, reviewable changes and deterministic orchestration.
