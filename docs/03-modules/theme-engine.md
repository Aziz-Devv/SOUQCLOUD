Document: Module: Theme Engine
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/themes.md, docs/01-architecture/decisions/ADR-003-schema-driven-theme-engine.md
Related Documents: docs/03-modules/store-builder-editor.md, docs/03-modules/storefront-rendering.md
Decisions: Declarative section schemas; Store owns content Pages independently of Themes; switching Themes preserves store content; CSS custom property token injection.
Open Questions: None

# Module Specification: Theme Engine

## 1. Purpose
The Theme Engine defines the presentation architecture for storefronts. It processes design tokens (typography, colors), parses declarative section schemas, and safely maps merchant configuration JSON into responsive storefront layouts without arbitrary server scripting.

---

## 2. Structural Relationship: Store &rarr; Theme &rarr; Page &rarr; Section

> **CRITICAL INVARIANT**: Content pages (`public.pages`) belong to the **Store**, not the Theme. Themes provide visual design tokens and a **Section Registry** of supported layout component schemas (`theme_template_id`).

### Theme Switching Lifecycle (Zero Content Loss)
When a merchant switches or activates a new theme:
1. All store content pages, text copy, and media references are **preserved intact**.
2. Page sections are re-validated against the newly activated theme's section registry.
3. Global styling adapts immediately to the newly activated theme's design tokens.

---

## 3. Data Model References
* `public.themes`: Theme presets, global settings, and design tokens.
* `public.pages`: Store-owned page layouts holding published and draft Section arrays.

---

## 4. Business Rules
1. Every Theme defines:
   * **Design Tokens**: Global visual properties (colors, typography, border radius, spacing) injected as CSS custom properties on the root HTML.
   * **Section Registry**: Set of available modular section components with defined JSON schemas.
2. Section schemas define input types (text, textarea, image_picker, color, select, range, checkbox, product_picker).
3. No merchant-supplied unvalidated HTML or script tags are evaluated inside theme components.

---

## 5. API Contract & Schemas
* `getThemeConfig(themeId: string)` &rarr; `ActionResult<ThemeConfig>`
* `activateTheme(storeId: string, themeId: string)` &rarr; `ActionResult<void>`
* `updateDesignTokens(themeId: string, tokens: DesignTokensInput)` &rarr; `ActionResult<void>`
* `getAvailableSections(themeTemplateId: string)` &rarr; `ActionResult<SectionSchema[]>`

---

## 6. Dependencies & Related Documents
* Dependencies: [themes.md (Entity)](../02-database/entities/themes.md), [ADR-003](../01-architecture/decisions/ADR-003-schema-driven-theme-engine.md)
* Related Documents: [store-builder-editor.md](../03-modules/store-builder-editor.md), [storefront-rendering.md](../03-modules/storefront-rendering.md)

---

## 7. Acceptance Criteria (Given / When / Then)
* **Given** a store with customized homepage sections, **When** the merchant activates a new theme, **Then** all homepage section content is preserved and rendered using the new theme's visual styling.
* **Given** valid design tokens, **When** rendered on the storefront, **Then** matching CSS custom properties are emitted on the root document.

---

## 8. Open Questions
* None.

---

## Implementation Status
* **Implementation Status**: Not Started
