Document: UI System & Design Tokens
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/04-ux-ui/ux-principles.md
Related Documents: docs/04-ux-ui/dashboard-ux.md, docs/04-ux-ui/storefront-ux.md, docs/03-modules/theme-engine.md
Decisions: Design token schema; accessible color contrast scales; standard component primitives.
Open Questions: None

# UI System & Design Tokens

## 1. Design Token Architecture

The platform uses a tokenized design system built around CSS custom properties to ensure visual consistency, dark/light mode adaptability, and structured theme customization.

---

## 2. Core Token Scales

### 2.1 Color Palette (Dashboard Default)
* **Neutral / Grayscale**:
  * `--color-bg-canvas`: `#F8FAFC` (Page background)
  * `--color-bg-surface`: `#FFFFFF` (Cards, Modals, Drawers)
  * `--color-border-subtle`: `#E2E8F0`
  * `--color-border-strong`: `#CBD5E1`
  * `--color-text-primary`: `#0F172A`
  * `--color-text-secondary`: `#64748B`
  * `--color-text-muted`: `#94A3B8`
* **Brand / Accent**:
  * `--color-brand-primary`: `#0284C7` (Sky 600)
  * `--color-brand-hover`: `#0369A1` (Sky 700)
  * `--color-brand-subtle`: `#E0F2FE` (Sky 100)
* **Feedback / Semantic**:
  * `--color-success`: `#16A34A` (Green 600)
  * `--color-warning`: `#D97706` (Amber 600)
  * `--color-danger`: `#DC2626` (Red 600)
  * `--color-info`: `#2563EB` (Blue 600)

### 2.2 Typography Scale
* **Font Families**:
  * Heading & Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  * Monospace (Code/SKUs/IDs): `ui-monospace, "SF Mono", Menlo, Consolas, monospace`
* **Type Sizes & Hierarchy**:
  * Display: `32px` / `2rem` (Line height: 1.2, Weight: 700)
  * Heading 1 (Page Title): `24px` / `1.5rem` (Line height: 1.3, Weight: 600)
  * Heading 2 (Card Title): `18px` / `1.125rem` (Line height: 1.4, Weight: 600)
  * Body Standard: `14px` / `0.875rem` (Line height: 1.5, Weight: 400)
  * Caption / Small: `12px` / `0.75rem` (Line height: 1.4, Weight: 400)

### 2.3 Spacing & Elevation Scale
* **Spacing**: `4px` (1), `8px` (2), `12px` (3), `16px` (4), `24px` (6), `32px` (8), `48px` (12), `64px` (16).
* **Border Radii**:
  * Button / Input: `6px` (`0.375rem`)
  * Card / Modal: `8px` (`0.5rem`)
  * Pill / Badge: `9999px`
* **Shadows**:
  * Card: `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`
  * Dropdown / Popover: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
  * Modal / Drawer: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`

---

## 3. Core Component Primitives

1. **Button**: Primary (solid brand), Secondary (outline/ghost), Danger (red), Icon-only. States: Default, Hover, Focus, Active, Disabled, Loading (with spinner).
2. **Input / Form Control**: Text input, Number stepper, Select dropdown, Checkbox, Toggle switch, Textarea. Supports label, helper text, error state, prefix/suffix icons.
3. **Badge / Tag**: Small pill indicators for statuses (e.g. `Paid` [green], `Unfulfilled` [yellow], `Draft` [gray]).
4. **Data Table**: Header sort, pagination bar, checkbox row selection, empty state view, responsive scroll.
5. **Modal / Dialog**: Backdrop overlay, keyboard ESC dismissal, focus trap, sticky footer action buttons.
6. **Toast Notification**: Lightweight sliding alert (Success, Error, Info) with auto-dismiss after 4 seconds.
