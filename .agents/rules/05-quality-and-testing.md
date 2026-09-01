# SOUQCLOUD — Code Quality & Testing

Coding conventions: @docs/06-process/CODING_STANDARDS.md
Testing conventions: @docs/06-process/TESTING_STANDARDS.md

This file covers only what those documents don't: priority and verification discipline.

## Test Priority
Prioritize exhaustive coverage for the highest-risk areas of this system specifically: order
state transitions, inventory mutations, tax calculations, monetary calculations, tenant
isolation, and authorization/security-sensitive flows.

## Verification Before Completion
Run the relevant typecheck, lint, unit tests, integration tests, build, and targeted runtime
verification before reporting a task as done. Do not skip failing verification just to claim
success. See @.agents/rules/07-ai-agent-discipline.md for completion-claim rules.

## Regression Safety
When fixing a bug: reproduce it, add or update a regression test, implement the fix, then
rerun the affected suite.
