Document: Entity: Stores
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/merchants.md, docs/01-architecture/multi-tenancy.md
Related Documents: docs/02-database/entities/products.md, docs/02-database/entities/themes.md, docs/01-architecture/domain-model.md
Decisions: public.stores represents the retail shop container; default_country_code is required during store setup (no silent geographic default); order_sequence_counter ensures race-free atomic order numbering; public storefront reads use public.public_stores view.
Open Questions: None

# Database Entity: Stores (`public.stores`)

## 1. Purpose & Domain Scope

The `public.stores` table represents an individual **Store** instance. It is the primary parent container for all retail operations, catalog items, themes, content pages, customers, orders, and fulfillment communication settings.

---

## 2. Table Schema Definition

```sql
CREATE TYPE public.store_status AS ENUM ('DRAFT', 'PUBLISHED', 'MAINTENANCE', 'ARCHIVED');
CREATE TYPE public.store_order_mode AS ENUM ('DASHBOARD', 'WHATSAPP', 'BOTH');

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  handle VARCHAR(100) NOT NULL UNIQUE,
  custom_domain VARCHAR(255) NULL UNIQUE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  default_locale VARCHAR(10) NOT NULL DEFAULT 'en',
  default_country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2 required on onboarding (e.g. SA, AE, KW, EG, JO)
  status public.store_status NOT NULL DEFAULT 'DRAFT',
  
  -- Store Order Mode & WhatsApp Contact Details
  order_mode public.store_order_mode NOT NULL DEFAULT 'BOTH',
  whatsapp_phone VARCHAR(50) NULL, -- Normalized E.164 contact number (e.g. +966501234567)
  whatsapp_settings JSONB NOT NULL DEFAULT '{
    "auto_redirect": true,
    "custom_message_template": null
  }'::jsonb,
  
  -- Atomic Store-Scoped Order Numbering Counter
  order_sequence_counter INTEGER NOT NULL DEFAULT 1000,
  
  -- Delivery & Tax Calculation Settings
  settings JSONB NOT NULL DEFAULT '{
    "shipping": {
      "flat_rate_cents": 500,
      "free_shipping_threshold_cents": null
    },
    "tax": {
      "tax_rate_basis_points": 0,
      "tax_included_in_price": false
    },
    "branding": {
      "logo_url": null,
      "favicon_url": null,
      "social_links": {}
    }
  }'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stores_id_merchant UNIQUE (id, merchant_id)
);

-- Indexes
CREATE INDEX idx_stores_merchant_id ON public.stores(merchant_id);
CREATE INDEX idx_stores_handle ON public.stores(handle);
CREATE INDEX idx_stores_custom_domain ON public.stores(custom_domain);
CREATE INDEX idx_stores_status ON public.stores(status);
```

---

## 3. Public Storefront Projection View (`public.public_stores`)

Direct `SELECT` on `public.stores` is revoked from anonymous clients. Public storefront applications query the secured view:

```sql
CREATE OR REPLACE VIEW public.public_stores AS
SELECT 
  id,
  name,
  handle,
  custom_domain,
  currency,
  default_locale,
  default_country_code,
  order_mode,
  whatsapp_phone,
  whatsapp_settings,
  settings->'branding' AS branding,
  settings->'shipping' AS shipping_settings,
  (settings->'tax'->>'tax_included_in_price')::BOOLEAN AS tax_included_in_price,
  (settings->'tax'->>'tax_rate_basis_points')::INTEGER AS tax_rate_basis_points,
  created_at
FROM public.stores
WHERE status = 'PUBLISHED';

-- Security Invariant:
-- public.public_stores is a deliberately restricted public projection containing only approved storefront-safe fields.
-- Internal/sensitive store fields must never be exposed through this projection without an explicit security review and documentation update.
-- It strictly excludes merchant_id, internal billing metadata, operational audit fields, and private configuration.
```

---

## 4. Deterministic Phone Normalization & Store Onboarding

* **Onboarding Requirement**: Merchants must explicitly select their store's primary operational country code (`default_country_code`) during the store creation wizard.
* **Phone Normalization Algorithm**:
  ```text
  1. Input: Raw customer phone string + store.default_country_code (ISO 3166-1 alpha-2)
  2. Sanitize: Strip all spaces, dashes, parentheses, and formatting dots.
  3. International Prefix Check:
     - If string begins with "+", validate standard E.164 digits.
     - If string begins with "00", replace "00" with "+".
  4. Local Prefix Conversion:
     - If string begins with a local national leading "0" (e.g. "0501234567" in SA, "0791234567" in JO), strip the leading "0".
     - Look up international calling code for default_country_code (e.g. SA -> +966, JO -> +962, AE -> +971, EG -> +20).
     - Prepend "+<calling_code>" to the remaining digits.
  5. E.164 Validation:
     - Check regex: ^\+[1-9]\d{6,14}$
     - If valid: Return normalized E.164 string (e.g. "+966501234567").
     - If invalid: Reject submission with INVALID_PHONE_NUMBER error.
  ```
