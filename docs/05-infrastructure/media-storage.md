Document: Media Storage
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/media-assets.md, docs/03-modules/media-assets.md
Related Documents: docs/05-infrastructure/cloudflare-setup.md
Decisions: Cloudflare R2 object storage with S3-compatible API; Presigned upload URLs; Public vs Private bucket key partitioning; Explicit CORS origin matching.
Open Questions: None

# Media Storage Architecture (Cloudflare R2)

## 1. Storage Engine Overview

Merchant media assets are stored in **Cloudflare R2 Object Storage**, providing zero-egress fee delivery and native S3 API compatibility via `@aws-sdk/client-s3`.

---

## 2. Directory Key Convention & Visibility Partitioning

Objects in the R2 bucket follow a structured, tenant-isolated key hierarchy separating public storefront assets from private sensitive documents:

```
souqcloud-media-bucket/
└── stores/
    └── <store_id>/
        ├── public/                     # Public Storefront Assets (CDN Delivered)
        │   ├── products/<uuid>-<file>.webp
        │   └── themes/<uuid>-<file>.png
        │
        └── private/                    # Private Merchant Documents (Signed URLs)
            ├── invoices/<uuid>-<file>.pdf
            └── exports/<uuid>-<file>.csv
```

---

## 3. Presigned Upload URL Workflow

Uploads occur directly from the merchant's browser to Cloudflare R2:

```
[ Merchant Browser ]
        │
        ├─ 1. POST /api/media/presigned-url (metadata, visibility: 'PUBLIC' | 'PRIVATE')
        ▼
[ Next.js Server ]
  - Authenticates merchant and verifies store_id
  - Generates S3 PutObjectCommand presigned URL (15 min expiry)
  - Returns presigned URL + target storage key
        │
        ├─ 2. Direct HTTP PUT to Presigned R2 URL
        ▼
[ Cloudflare R2 Storage ]
        │
        ├─ 3. Upload Success
        ▼
[ Merchant Browser ]
  - 4. Calls Server Action to register public.media_assets record
```

---

## 4. Valid CORS Configuration & CDN Domain

To maintain strict web standards, CORS configuration uses **exact origin matching** rather than unsupported wildcard origins:

```json
[
  {
    "AllowedOrigins": [
      "https://app.souqcloud.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Access Modes:
* **Public Assets**: Delivered via CDN custom domain `https://cdn.souqcloud.com/stores/<store_id>/public/...`.
* **Private Assets**: Root CDN blocks direct access; access requires an authenticated server-generated `GetObjectCommand` presigned URL (15-minute expiration).
