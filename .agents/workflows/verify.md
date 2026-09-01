# /verify

Run, in order, whatever apply to the changed code:

1. Typecheck
2. Lint
3. Unit tests
4. Integration tests
5. Build
6. Any targeted runtime/manual verification relevant to the change (e.g. a tenant-isolation
   check for a multi-tenant change, a tax-calculation check for a pricing change)

Report results plainly, including failures. Do not report success if any step failed or was
skipped. See @.agents/rules/05-quality-and-testing.md.
