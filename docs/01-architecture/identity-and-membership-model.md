Document: Identity and Membership Model
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-vision.md, docs/00-product/glossary.md
Related Documents: docs/01-architecture/architecture-rules.md, docs/01-architecture/multi-tenancy.md, docs/01-architecture/security-authz.md, docs/02-database/entities/identities.md, docs/02-database/entities/users.md, docs/02-database/entities/memberships.md
Decisions: Five-tier identity hierarchy adopted (Auth Identity -> User -> Membership -> Merchant Organization -> Store).
Open Questions: None

# Identity and Membership Model

## 1. Architectural Model Overview

To support multi-store merchants, collaborative team permissions, and cross-organization operations without requiring future data model rewrites, the platform implements a five-tier identity hierarchy:

```
[ Supabase Auth Identity (auth.users) ]
                   │
                   ▼ (1:1 link via uuid)
          [ User (public.users) ]
                   │
                   ▼ (1:N memberships)
       [ Membership (public.memberships) ]
         ├── Role: Owner | Admin | Staff
         ├── Status: Active | Invited | Suspended
         │
         ▼ (N:1 belongs to)
  [ Merchant / Organization (public.merchants) ]
         │
         ▼ (1:N owns)
      [ Store (public.stores) ]
```

---

## 2. Rationale: Why Not a Flat Model?

A naive model (such as `User -> Store` or `User -> Merchant -> Store` with a flat foreign key) creates severe architectural dead-ends:
1. **Blocks Multi-User Staff Collaboration**: A flat model cannot easily represent staff members with distinct roles across multiple stores.
2. **Blocks Multi-Organization Users**: A consultant, agency designer, or business owner operating multiple distinct legal businesses would require multiple separate email logins.
3. **Complicates Access Revocation**: Removing an employee or transferring ownership requires destructive data mutations rather than updating membership records.

---

## 3. Component Details & Boundaries

### 3.1 Auth Identity (`auth.users`)
* Managed by Supabase Auth.
* Encapsulates authentication credentials (email, hashed password, OAuth provider tokens, phone numbers).
* Generates and validates cryptographic JSON Web Tokens (JWT).

### 3.2 Application User (`public.users`)
* The platform-wide human identity profile.
* Key fields: `id` (UUID matching `auth.users.id`), `email`, `full_name`, `avatar_url`, `created_at`.
* Created automatically upon first authentication via transactional database triggers.

### 3.3 Membership (`public.memberships`)
* Represents the active association between a `User` and a `Merchant / Organization`.
* Attributes:
  * `merchant_id`: Foreign key to `public.merchants`.
  * `user_id`: Foreign key to `public.users`.
  * `role`: `OWNER`, `ADMIN`, `STAFF`.
  * `status`: `ACTIVE`, `INVITED`, `SUSPENDED`.
  * `permissions`: Optional JSONB granular overrides for advanced role scoping in Phase 2+.

### 3.4 Merchant / Organization (`public.merchants`)
* The legal commercial tenant owning the stores, billing relationship, and staff accounts.
* Owns one or more `Store` instances.

### 3.5 Store (`public.stores`)
* The operational retail unit holding products, themes, pages, and orders.
* Belongs strictly to a single `merchant_id`.

---

## 4. Role Matrix and Permissions

| Role | Scope | Capabilities |
|---|---|---|
| **OWNER** | Organization & All Stores | Full control; billing management; organization deletion; ownership transfer; team invitations. |
| **ADMIN** | Organization & All Stores | Manage team members; create/delete stores; manage all catalog and theme operations; view financials. |
| **STAFF** | Assigned Store(s) | View/edit products; process and fulfill orders; view basic customer details; no access to billing or team management. |

---

## 5. Lifecycle and Operations

1. **Sign-up Flow**: User registers &rarr; `auth.users` created &rarr; Trigger creates `public.users` &rarr; Creates `public.merchants` (Organization) &rarr; Creates `public.memberships` with role `OWNER` &rarr; Creates initial `public.stores` instance.
2. **Invitation Flow**: Owner invites email &rarr; Creates `public.memberships` in `INVITED` state &rarr; Invitee accepts invitation &rarr; Membership status updated to `ACTIVE`.
