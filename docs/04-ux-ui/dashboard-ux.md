Document: Dashboard UX
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/04-ux-ui/ui-system.md, docs/03-modules/dashboard-shell.md
Related Documents: docs/04-ux-ui/user-flows.md, docs/03-modules/orders.md, docs/03-modules/products.md
Decisions: Standards for merchant admin views: data tables, detail views, WhatsApp contact actions, order status filters (New, Contacted, Confirmed, Preparing, Ready, Delivered, Cancelled).
Open Questions: None

# Dashboard UX Specification

## 1. Overview & Layout Shell

The Merchant Dashboard is the central administrative interface for managing commerce operations. It utilizes a three-zone responsive layout:
* **Top Navigation Bar (60px height)**: Store Switcher dropdown, Quick Search trigger (`⌘K`), Notifications bell, User Profile menu.
* **Left Navigation Sidebar (240px width desktop, collapsible off-canvas mobile)**: Primary navigation links (Home, Orders, Products, Customers, Online Store, Settings).
* **Main Content Area**: Padded container (`max-width: 1280px`) with standardized header (breadcrumbs, title, primary action buttons).

---

## 2. Orders Management Views

### 2.1 Orders List View Pattern
* **Status Filter Tabs**: `All`, `New`, `Contacted`, `Confirmed`, `Preparing`, `Ready`, `Delivered`, `Cancelled`.
* **Search Bar**: Instant phone number, customer name, and order number search.
* **Data Table Columns**: Order Number (`#1001`), Date, Customer Name & Phone, Items Summary, Order Mode Used (`Dashboard` / `WhatsApp`), Total Amount, Status Badge.

### 2.2 Order Detail View Pattern
* **Two-Column Grid**:
  * **Main Column (65% width)**: Ordered line items table, subtotal, delivery fee, tax, total, customer notes.
  * **Sidebar Column (35% width)**:
    * **Customer Contact Card**: Name, phone, email, delivery address, with a prominent **"Contact via WhatsApp"** button (opens pre-filled WhatsApp chat).
    * **Order Status Card**: Interactive status dropdown (`New` &rarr; `Contacted` &rarr; `Confirmed` &rarr; `Preparing` &rarr; `Ready` &rarr; `Delivered`), merchant internal notes field, and "Cancel Order" option.
