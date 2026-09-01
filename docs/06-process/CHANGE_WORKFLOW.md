Document: Change Workflow
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/06-process/AI_DEVELOPMENT_PROTOCOL.md
Related Documents: docs/06-process/PROJECT_STATE.md, docs/06-process/DOCUMENTATION_STANDARDS.md
Decisions: Structured 7-step specification-first change process.
Open Questions: None

# Specification-First Change Workflow

## 1. Purpose & Philosophy

To prevent architectural entropy and specification drift, all enhancements, schema changes, and feature additions must follow a strict **Specification-First Change Workflow**.

---

## 2. The 7-Step Change Lifecycle

```
[ Step 1: Identify Need ] ──► [ Step 2: Articulate 'Why' ]
                                          │
                                          ▼
[ Step 4: Update Architecture/ADR ] ◄── [ Step 3: Update Module Spec ]
         │
         ▼
[ Step 5: Implement Code ] ──► [ Step 6: Automated Verification ]
                                          │
                                          ▼
                             [ Step 7: Update PROJECT_STATE ]
```

### Step 1: Identify the Need
* State the concrete user problem or operational deficiency requiring modification.

### Step 2: Articulate the "Why"
* Explain why existing patterns cannot accommodate the requirement and evaluate tradeoffs against `docs/00-product/product-principles.md`.

### Step 3: Update Module & Product Specs
* Update the relevant document in `docs/00-product/` or `docs/03-modules/`.

### Step 4: Update Architecture & Database Specs (If Applicable)
* If data models or system boundaries change, update `docs/01-architecture/` or `docs/02-database/` and create a new ADR.

### Step 5: Implement Code
* Write the implementation adhering strictly to updated specifications.

### Step 6: Automated Verification
* Execute test suites (Unit, Integration, E2E) to verify acceptance criteria.

### Step 7: Update Project State
* Record completed milestone in `docs/06-process/PROJECT_STATE.md`.
