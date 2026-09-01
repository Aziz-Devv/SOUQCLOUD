# /plan

Given a requested feature or change:

1. Read @docs/README.md and the relevant section(s) of @docs/MASTER_DOCUMENTATION_TOC.md.
2. Read the specific module/entity/architecture docs affected.
3. Inspect the current implementation of anything this touches.
4. Identify affected boundaries (tenancy, security, API contract, schema).
5. Produce a written implementation plan: files to touch, new files needed, data model
   impact, API contract impact, test plan. NO CODE in this step.
6. List open questions or ambiguities explicitly — do not silently resolve them.
7. Stop and present the plan for approval before running `/implement`.
