Document: Module: Authentication & Session Management
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/identities.md, docs/02-database/entities/users.md
Related Documents: docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/security-authz.md
Decisions: Supabase Auth for credential management; automatic sync triggers (handle_new_user and handle_user_email_update) to public.users; HTTP-only cookies via @supabase/ssr.
Open Questions: None

# Module Specification: Authentication & Session Management

## 1. Purpose
The Authentication module handles merchant identity verification, registration, login, password recovery, and secure session management using Supabase Auth and `@supabase/ssr` cookies.

---

## 2. Synchronization Invariants

1. **Canonical Identity**: `auth.users` holds credentials and primary email.
2. **PostgreSQL Triggers**:
   * `on_auth_user_created` initializes `public.users`.
   * `on_auth_user_email_updated` synchronizes `public.users.email` when the authentication email changes.

---

## 3. Data Model References
* `auth.users`: Managed credentials and tokens.
* `public.users`: Platform user profile record.
* `public.memberships`: Role associations within organizations.

---

## 4. API Contract & Actions
* `signUpWithPassword(input: SignUpInput)` &rarr; `ActionResult<{ userId: string }>`
* `signInWithPassword(input: SignInInput)` &rarr; `ActionResult<{ redirectUrl: string }>`
* `signOut()` &rarr; `ActionResult<void>`
* `requestPasswordReset(email: string)` &rarr; `ActionResult<void>`

---

## 5. Implementation Status
* **Implementation Status**: Not Started
