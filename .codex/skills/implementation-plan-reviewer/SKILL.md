---
name: implementation-plan-reviewer
description: Create and independently review a software implementation plan before coding. Use a real reviewer subagent when available; otherwise clearly label a self-review fallback.
---

# Implementation Plan Reviewer

## Goal
Produce an implementation-ready plan with meaningful independent review while avoiding over-analysis.

## Workflow
1. Inspect only repository areas relevant to the task and immediate dependencies.
2. Create a concise initial implementation plan based on repository evidence.
3. Spawn exactly one reviewer subagent when subagents are available.
4. The reviewer independently inspects relevant code and treats the plan as untrusted.
5. Reviewer focuses on correctness, security, data integrity, compatibility, architecture, and critical testing gaps.
6. Reconcile valid findings into the final plan.
7. Do not implement until review is complete.

## Reviewer limits
- Maximum 5 Major findings.
- Maximum 3 Minor findings.
- Maximum 2 Suggestions.
- Critical findings are unlimited when genuine.
- Do not report duplicate findings.
- Do not nitpick naming, formatting, hypothetical future scale, or speculative requirements.
- Stop when no new Critical or Major issues are emerging.
- If the plan is sound, approve it.

## Independence
The reviewer must receive the original requirement and independently inspect the repository. Planner summaries are not evidence. Do not claim an independent review happened unless a real subagent was used.

## Output
Return: repository findings, initial plan summary, reviewer verdict/findings, accepted/rejected findings, final plan, tests, risks, assumptions, and readiness verdict.
