Document: Error Handling
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-rules.md, docs/01-architecture/api-architecture.md
Related Documents: docs/01-architecture/security-authz.md
Decisions: Universal platform error taxonomy and client-safe sanitization pipeline locked.
Open Questions: None

# Error Handling & Taxonomy

## 1. Universal Error Taxonomy

To provide predictable diagnostics and prevent leaking internal implementation details to clients, the platform defines a shared platform error taxonomy:

| Error Code | HTTP Status | Description & Triggers |
|---|---|---|
| `VALIDATION_ERROR` | `400 Bad Request` | Payload failed Zod schema validation, missing required fields, or invalid formats. |
| `UNAUTHORIZED` | `401 Unauthorized` | Missing, expired, or invalid authentication session/token. |
| `FORBIDDEN` | `403 Forbidden` | Authenticated user lacks permission to access or mutate the requested resource. |
| `NOT_FOUND` | `404 Not Found` | Requested entity (Store, Product, Order) does not exist or is inaccessible in tenant scope. |
| `CONFLICT` | `409 Conflict` | Unique constraint violation (e.g. duplicate store subdomain handle, conflicting state transition). |
| `RATE_LIMITED` | `429 Too Many Requests` | Request threshold exceeded for IP or tenant quota. |
| `INTERNAL_ERROR` | `500 Internal Server Error` | Unexpected server failure. Internal stack traces are logged server-side and masked from clients. |

---

## 2. Standardized Error Response Envelope

All API routes and Server Actions return errors conforming to this structured schema:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The product information is invalid.",
    "details": [
      {
        "field": "price",
        "issue": "Price must be a positive number."
      }
    ],
    "request_id": "req_01h9a8f2k0..."
  }
}
```

---

## 3. Error Handling Flow & Security Sanitization

```
[ Exception Occurs in Application / Database ]
                     │
                     ▼
           [ Platform Error Boundary ]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  [ Known Domain Error ]    [ Unexpected / DB Exception ]
  (e.g., AppError)          (e.g., Postgres connection error)
         │                       │
         │                       ├─ Log full stack trace & telemetry
         │                       └─ Map to code: "INTERNAL_ERROR"
         │                          message: "An unexpected error occurred."
         ▼                       ▼
   [ Format Standardized Error Envelope ]
   (Sanitized, localized, request_id attached)
                     │
                     ▼
         [ Return to Browser / Client ]
```

### Sanitization Rules
1. **Never Expose SQL Details**: Database column names, table names, and raw query errors must never be returned to the client.
2. **Never Expose Stack Traces**: Stack traces are sent exclusively to structured server logs / observability tools.
3. **Correlation ID**: Every error response includes a `request_id` allowing customer support and engineering to correlate client reports with server logs.
