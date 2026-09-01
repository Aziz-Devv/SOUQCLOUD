# SOUQCLOUD — Project Governance

## Source of Truth
The approved documentation under `/docs` is authoritative. Chat history, prompt assumptions,
and speculative preferences are NEVER a source of truth.

Entry points:
- @docs/README.md
- @docs/MASTER_DOCUMENTATION_TOC.md

## Before Any Implementation
Follow the pre-task checklist defined in @docs/06-process/AI_DEVELOPMENT_PROTOCOL.md exactly.
Do not restate or reinterpret it — read it fresh each time, since it is the single source of
truth for this checklist.

## No Silent Decisions
Do not independently invent architecture, database structures, authorization models, API
patterns, infrastructure topology, new abstractions, or new product behavior when an approved
specification already exists in `/docs`.

If documentation is ambiguous, missing, or contradictory:
1. Stop before making a major architectural decision.
2. State the conflict or gap plainly.
3. Explain the impact of each possible interpretation.
4. Propose the smallest documented correction, or ask for clarification.

## Scope Discipline
Implement exactly the requested capability. Do not add unrelated features, refactor unrelated
modules, replace working patterns without justification, introduce new technologies for
convenience, or create duplicate abstractions.

## Verification
Never report completion merely because code was written. See
@.agents/rules/05-quality-and-testing.md for what verification is required before a task can
be marked done.
