Document: ADR-003: Schema-Driven Theme Engine & Page Lifecycle
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md, docs/00-product/product-principles.md
Related Documents: docs/01-architecture/architecture-rules.md, docs/03-modules/theme-engine.md, docs/03-modules/store-builder-editor.md
Decisions: Schema-driven declarative theme customizer adopted; Store owns content Pages independently of Themes; switching Themes preserves page content; optimistic concurrency (version CAS) prevents silent editor draft overwrites.
Open Questions: None

# ADR-003: Schema-Driven Theme Engine & Page Lifecycle Architecture

## Status
Proposed (Draft Master Specification)

## Context
Merchants require visual customization over storefront layouts, branding, colors, and content sections without risking data loss when switching themes or experiencing silent draft overwrites during concurrent editor sessions.

## Decision
We adopt a **Schema-Driven, Declarative Theme Architecture with Store-Owned Content Pages and Optimistic Concurrency**:

1. **Store Ownership of Content Pages**:
   * Content pages (`public.pages`) belong to `store_id`, **not** to a specific theme.
   * `Theme` provides design tokens (colors, typography) and a **Section Registry** of supported section component schemas (`theme_template_id`).

2. **Theme Switching Lifecycle (Zero Content Loss)**:
   * When a merchant activates a new theme, all store pages, section configurations, text copy, and media references are **preserved intact**.
   * Sections are re-validated against the newly active theme's section registry. Standard sections render immediately with the new theme's visual styling.

3. **Preview vs Published Isolation**:
   * Edits inside the Store Builder mutate `pages.draft_sections`.
   * The live storefront serves `pages.sections` until the merchant explicitly clicks "Publish".

4. **Optimistic Concurrency for Editor Drafts**:
   * `public.pages` includes an integer `version` field.
   * Saving a draft uses a Compare-And-Swap (CAS) update (`WHERE id = $id AND version = $expected_version`). If the version has changed (e.g. from another tab or user), the update is rejected with a conflict error, preventing silent overwrites of newer edits.

## Consequences
### Positive
* Switching themes never causes merchant data loss.
* Draft customizations are completely isolated from live shoppers.
* Prevents silent data loss from stale editor tabs via optimistic version checks.

### Negative / Tradeoffs
* Merchants cannot write raw custom server scripts directly into templates.
