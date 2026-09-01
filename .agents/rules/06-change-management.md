# SOUQCLOUD — Change Management

The full change sequence (understand → read docs → inspect code → plan → implement smallest
change → verify → review diff → update docs → update state) is defined once in
@docs/06-process/CHANGE_WORKFLOW.md. Follow it exactly; do not restate or reinterpret it here.

## When This Rule Fires
If a requested implementation requires changing schema, RLS, tenancy, API contract, domain
ownership, infrastructure, a security boundary, or a core state machine (order/cart/payment
lifecycle) — do NOT silently change it.

Instead, report:
1. The current documented rule.
2. The requested change.
3. Affected components.
4. Migration/compatibility impact.
5. Which documents under `/docs` must change.

Then wait for explicit approval before implementing.

## Diff Discipline
Do not leave unrelated changes in the same task. Every task should be explainable as one
coherent change set.
