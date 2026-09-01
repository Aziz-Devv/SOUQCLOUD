Document: Module: Store Builder & Editor
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/03-modules/theme-engine.md, docs/02-database/entities/pages.md
Related Documents: docs/03-modules/publishing.md, docs/04-ux-ui/dashboard-ux.md
Decisions: Side-by-side visual editor with sandboxed preview iframe; Dual revision model (draft_sections for preview, sections for live); optimistic concurrency with version CAS.
Open Questions: None

# Module Specification: Store Builder & Visual Editor

## 1. Purpose
The Store Builder / Visual Editor provides merchants with an interactive visual customizer. Merchants can configure page sections and design tokens, previewing draft changes in real time before publishing to the live storefront.

---

## 2. Optimistic Concurrency & Draft Revision Control

1. **Dual Revisions**: Edits inside the Store Builder mutate `pages.draft_sections`, leaving the live `pages.sections` undisturbed.
2. **Optimistic Version CAS**:
   * The builder loads the page along with its current `version`.
   * Saving a draft executes a Compare-And-Swap:
     ```sql
     UPDATE public.pages
     SET draft_sections = $draft_sections, version = version + 1, updated_at = NOW()
     WHERE id = $id AND store_id = $store_id AND version = $expected_version;
     ```
   * If 0 rows are updated, the action fails with a `409 Conflict` error, preventing stale editor sessions from silently overwriting newer edits.

---

## 3. Data Model References
* `public.pages`: Target page entity holding `draft_sections`, `sections`, and `version`.
* `public.themes`: Active theme settings and design tokens.

---

## 4. API Contract & Actions
* `getPageBuilderData(pageId: string)` &rarr; `ActionResult<{ page: Page; draftSections: SectionConfig[]; version: number; schemas: SectionSchema[] }>`
* `saveDraftSections(pageId: string, sections: SectionConfig[], expectedVersion: number)` &rarr; `ActionResult<{ newVersion: number }>`
* `publishPageSections(pageId: string)` &rarr; `ActionResult<void>`
* `discardDraftSections(pageId: string)` &rarr; `ActionResult<void>`

---

## 5. Implementation Status
* **Implementation Status**: Not Started
