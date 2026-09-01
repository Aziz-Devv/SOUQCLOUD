Document: AI Development Protocol
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-principles.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/06-process/CHANGE_WORKFLOW.md, docs/06-process/CODING_STANDARDS.md, docs/06-process/DOCUMENTATION_STANDARDS.md
Decisions: Mandatory engineering protocol for all AI coding agents (Gemini / Antigravity); documentation as the sole source of truth.
Open Questions: None

# AI Development Protocol

## 1. Core Operating Principles for AI Agents

This protocol defines the mandatory rules of engagement for AI coding assistants (such as Gemini / Antigravity) working on the codebase.

> **CRITICAL RULE 1: Documentation is the ONLY Source of Truth**  
> The approved documentation in `/docs` is the definitive source of truth for the platform. AI agents must **never** treat transient chat history, prompt assumptions, or speculative preferences as project requirements.

> **CRITICAL RULE 2: Never Invent Unapproved Architectural Patterns**  
> When an architectural pattern, entity relationship, or error structure is defined in the documentation, the AI agent must implement that exact pattern. The agent must never invent ad-hoc alternatives.

> **CRITICAL RULE 3: Inspect Relevant Documentation Before Writing Code**  
> Before implementing or modifying any component, the AI agent must read the relevant module specification, database entity definition, and architecture rule.

> **CRITICAL RULE 4: Zero Silent Architectural Drift**  
> An AI agent must never introduce architectural changes, new database tables, or new external dependencies silently. Any required architectural evolution must follow the Change Workflow.

---

## 2. Mandatory AI Pre-Task Checklist

Before writing code for any task, the AI agent must verify:
1. **Scope Check**: Is the task within the approved Phase 1 Scope?
2. **Entity Check**: Does the code match the entity definitions in `docs/02-database/entities/`?
3. **Module Check**: Does the implementation satisfy the acceptance criteria in `docs/03-modules/`?
4. **Security Check**: Are authorization and RLS policies enforced server-side?
5. **No Synonyms**: Are domain terms used strictly per `docs/00-product/glossary.md`?

---

## 3. Mandatory AI Post-Task Checklist

After completing any code implementation, the AI agent must:
1. Run automated lint, type check, and unit test suites.
2. Verify multi-tenant isolation tests.
3. Update `docs/06-process/PROJECT_STATE.md` if milestone states have progressed.
4. Document any new architectural decisions in an ADR if approved by the user.
