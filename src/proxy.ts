import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 Network Proxy (Node.js Container Runtime)
 * 
 * Responsibilities:
 * 1. Inspect incoming Host header (e.g. app.souqcloud.com vs shop.souqcloud.com vs custom domain).
 * 2. Strip any untrusted client-supplied tenant headers (x-tenant-*).
 * 3. Perform lightweight routing rewrites to target route groups.
 * 4. Inject server-derived routing headers (x-tenant-host, x-request-id) for downstream Server Components.
 * 
 * SECURITY INVARIANT:
 * x-tenant-* headers are routing context only, NEVER trusted as authorization or ownership proof.
 * Downstream Server Components and Server Actions validate tenant existence, user session, and RLS policies.
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'souqcloud.com';

export interface TenantRoutingResult {
  isDashboard: boolean;
  isStorefront: boolean;
  isMarketing: boolean;
  handle: string | null;
  host: string;
}

export function parseHostname(host: string | null): TenantRoutingResult {
  const cleanHost = (host || '').toLowerCase().split(':')[0] || '';

  // 1. Merchant Dashboard Subdomain
  if (cleanHost === `app.${ROOT_DOMAIN}` || cleanHost === 'app.localhost') {
    return {
      isDashboard: true,
      isStorefront: false,
      isMarketing: false,
      handle: null,
      host: cleanHost,
    };
  }

  // 2. Marketing / Platform Apex Domain
  if (
    cleanHost === ROOT_DOMAIN ||
    cleanHost === `www.${ROOT_DOMAIN}` ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === ''
  ) {
    return {
      isDashboard: false,
      isStorefront: false,
      isMarketing: true,
      handle: null,
      host: cleanHost,
    };
  }

  // 3. Storefront Subdomain (e.g. "brand.souqcloud.com" or "brand.localhost")
  if (cleanHost.endsWith(`.${ROOT_DOMAIN}`)) {
    const handle = cleanHost.replace(`.${ROOT_DOMAIN}`, '');
    return {
      isDashboard: false,
      isStorefront: true,
      isMarketing: false,
      handle,
      host: cleanHost,
    };
  }

  if (cleanHost.endsWith('.localhost')) {
    const handle = cleanHost.replace('.localhost', '');
    return {
      isDashboard: false,
      isStorefront: true,
      isMarketing: false,
      handle,
      host: cleanHost,
    };
  }

  // 4. Custom Domain (e.g. "www.fashionbrand.com")
  return {
    isDashboard: false,
    isStorefront: true,
    isMarketing: false,
    handle: null, // Resolved downstream via custom domain cache
    host: cleanHost,
  };
}

export function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // Create request headers clone with untrusted headers stripped
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-store-id'); // Strip client-supplied tenant overrides
  requestHeaders.delete('x-tenant-handle');
  requestHeaders.delete('x-tenant-host');
  requestHeaders.set('x-request-id', requestId);

  // Bypass proxy rewrites for static assets and internal Next.js endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const routing = parseHostname(host);
  requestHeaders.set('x-tenant-host', routing.host);

  // 1. Dashboard Routing Rewrite
  if (routing.isDashboard) {
    // If accessing root of dashboard domain, rewrite to /app/home
    const targetPath = pathname === '/' ? '/app/home' : pathname;
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Storefront Routing Rewrite
  if (routing.isStorefront) {
    if (routing.handle) {
      requestHeaders.set('x-tenant-handle', routing.handle);
    }
    // Downstream Server Components in (storefront) render the catalog for this host
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 3. Apex / Marketing Domain (with dev ?store= parameter support)
  const devStoreParam = request.nextUrl.searchParams.get('store');
  if (devStoreParam && routing.isMarketing) {
    requestHeaders.set('x-tenant-handle', devStoreParam.trim().toLowerCase());
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
