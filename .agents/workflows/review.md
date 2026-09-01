# /review

Review the current diff as a critical reviewer, not as its author.

1. Does it match the approved plan from `/plan`? Flag anything extra or missing.
2. Does it comply with every file in `.agents/rules/`?
3. Does it match the relevant `/docs` specification exactly (entities, API contract,
   acceptance criteria)?
4. Any security concern per @.agents/rules/02-security-and-data.md?
5. Any documentation that now needs updating because the implementation changed an approved
   contract?
6. Report findings as a list. Do not silently fix issues found during review — report them
   and wait for direction, per @.agents/rules/06-change-management.md.
