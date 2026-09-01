Document: Documentation Standards
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/06-process/AI_DEVELOPMENT_PROTOCOL.md, docs/06-process/CODING_STANDARDS.md
Related Documents: docs/06-process/CHANGE_WORKFLOW.md, docs/MASTER_DOCUMENTATION_TOC.md
Decisions: Strict documentation metadata header standards; separation of Document Status from Implementation Status; clear Full Spec vs Blueprint criteria.
Open Questions: None

# Documentation Standards & Governance

## 1. Documentation Authority & Status Duality

Documentation serves as the authoritative source of truth for the platform. To eliminate ambiguity during engineering execution:
1. **Document Review Status (`Status`)**: Tracks the review lifecycle of the documentation file itself (`Draft | In Review | Approved`).
2. **Implementation Status (`Implementation Status`)**: Tracks physical software implementation state (`Not Started | In Progress | Done`).

---

## 2. Standard Document Header

Every documentation file must begin with this exact metadata header:

```markdown
Document: <Document Title>
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec | Blueprint
Dependencies: <comma-separated document paths, or None>
Related Documents: <comma-separated document paths, or None>
Decisions: <locked architectural decisions>
Open Questions: <unresolved items, or None>
```

---

## 3. Specification Depth Standards

* **Full Spec**: Implementation-ready detail for anything within Phase 1's vertical slice. Must define exact database schemas, Zod validation contracts, error codes, and Given/When/Then acceptance criteria.
* **Blueprint**: Strategic boundary and interface constraints for Phase 2+ roadmap modules. Defines domain boundaries and constraints without prematurely over-specifying unbuilt code.

---

## 4. Module Specification Template

Functional module specifications under `docs/03-modules/` must include:
1. Purpose & Domain Scope
2. Data Model References
3. Business Rules & Logic
4. API Contract & Actions
5. UI/UX Reference
6. Acceptance Criteria (Given / When / Then)
7. Implementation Status (`Implementation Status: Not Started | In Progress | Done`)
