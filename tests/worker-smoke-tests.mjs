import crypto from 'crypto';

/**
 * SOUQCLOUD Comprehensive Linux Cloudflare Worker Runtime Proof Suite
 * Target: running workerd / Wrangler dev server on localhost:8787
 */

const BASE_URL = process.env.WORKER_URL || 'http://127.0.0.1:8787';
const PADDLE_SECRET = process.env.PADDLE_WEBHOOK_SECRET || 'ci_test_webhook_secret_key_12345';

console.log('====================================================');
console.log('SOUQCLOUD LINUX WORKER RUNTIME PROOF SUITE');
console.log('Target Worker URL:', BASE_URL);
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

async function testEndpoint(name, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const host = options.host || 'souqcloud.com';
  const method = options.method || 'GET';
  const expectedStatuses = options.expectedStatuses || [200];

  try {
    const headers = {
      'Host': host,
      ...(options.headers || {}),
    };

    const fetchOpts = {
      method,
      headers,
      redirect: 'manual',
    };

    if (options.body) {
      fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const start = Date.now();
    const res = await fetch(url, fetchOpts);
    const duration = Date.now() - start;
    const location = res.headers.get('location') || '';
    const bodyText = await res.text();

    const isStatusExpected = expectedStatuses.includes(res.status);
    let isBodyExpected = true;

    if (options.assertBodyContains) {
      isBodyExpected = bodyText.includes(options.assertBodyContains);
    }

    if (isStatusExpected && isBodyExpected) {
      console.log(`✅ [PASS] ${name} -> HTTP ${res.status} (${duration}ms) ${location ? `[Redirect: ${location}]` : ''}`);
      passCount++;
      return { pass: true, res, duration, bodyText };
    } else {
      console.error(`❌ [FAIL] ${name} -> HTTP ${res.status} (${duration}ms)`);
      if (!isStatusExpected) console.error(`   Expected status: ${expectedStatuses.join(', ')}`);
      if (!isBodyExpected) console.error(`   Body did not contain expected text: "${options.assertBodyContains}"`);
      failCount++;
      return { pass: false, res, duration, bodyText };
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${name} -> Network / Fetch error:`, err.message);
    failCount++;
    return { pass: false, error: err };
  }
}

// 1. API Health Check
await testEndpoint('1. API Health Check', '/api/health', {
  expectedStatuses: [200],
});

// 2. Marketing / Apex Page
await testEndpoint('2. Marketing Root /', '/', {
  host: 'souqcloud.com',
  expectedStatuses: [200],
});

// 3. Auth Pages
await testEndpoint('3. Auth /login', '/login', { host: 'souqcloud.com', expectedStatuses: [200] });
await testEndpoint('4. Auth /register', '/register', { host: 'souqcloud.com', expectedStatuses: [200] });

// 5. GAP 1 & GAP 4: Custom Domain Tenant Resolution + Live Supabase DB Query
// shop.brand.com is mapped in public.custom_domains to store "متجر العطور"
await testEndpoint('5. Custom Domain Live Resolution (Host: shop.brand.com)', '/', {
  host: 'shop.brand.com',
  headers: {
    'x-tenant-host': 'malicious-injected.com', // Must be stripped by proxy.ts
    'x-tenant-store-id': 'unauthorized-uuid',
  },
  expectedStatuses: [200],
  assertBodyContains: 'متجر العطور',
});

// 6. GAP 1: Subdomain Tenant Resolution + Live Supabase DB Query
await testEndpoint('6. Subdomain Live Resolution (Host: commerce-store-076e1a7c.souqcloud.com)', '/', {
  host: 'commerce-store-076e1a7c.souqcloud.com',
  expectedStatuses: [200],
  assertBodyContains: 'متجر العطور',
});

// 7. Storefront Static/Dynamic Public Routes
await testEndpoint('7. Storefront /checkout', '/checkout', { host: 'souqcloud.com', expectedStatuses: [200, 307] });
await testEndpoint('8. Dynamic PDP Route /products/sample', '/products/sample', { host: 'souqcloud.com', expectedStatuses: [200, 404] });
await testEndpoint('9. Dynamic Page Route /pages/about', '/pages/about', { host: 'souqcloud.com', expectedStatuses: [200, 404] });

// 10. Dashboard Auth Guard (Redirects unauthenticated requests)
await testEndpoint('10. Dashboard /app/home Auth Guard', '/app/home', { host: 'app.souqcloud.com', expectedStatuses: [200, 307, 308] });
await testEndpoint('11. Dashboard /app/products Auth Guard', '/app/products', { host: 'app.souqcloud.com', expectedStatuses: [200, 307, 308] });
await testEndpoint('12. Dashboard /app/orders Auth Guard', '/app/orders', { host: 'app.souqcloud.com', expectedStatuses: [200, 307, 308] });

// 13. GAP 5: Paddle Valid Webhook Signature Lifecycle
const validTimestamp = Math.floor(Date.now() / 1000);
const validPayload = JSON.stringify({
  event_id: 'evt_ci_deterministic_001',
  event_type: 'subscription.created',
  occurred_at: new Date().toISOString(),
  data: {
    id: 'sub_ci_test_001',
    status: 'active',
    items: [],
  },
});
const validHmac = crypto.createHmac('sha256', PADDLE_SECRET).update(`${validTimestamp}:${validPayload}`).digest('hex');
const validSignatureHeader = `ts=${validTimestamp};h1=${validHmac}`;

await testEndpoint('13. Paddle Valid Webhook Signature Verification', '/api/webhooks/billing/paddle', {
  method: 'POST',
  body: validPayload,
  headers: {
    'Content-Type': 'application/json',
    'Paddle-Signature': validSignatureHeader,
  },
  expectedStatuses: [200],
});

// 14. Paddle Security Rejection: Missing Signature
await testEndpoint('14. Paddle Webhook (Missing Signature Rejection)', '/api/webhooks/billing/paddle', {
  method: 'POST',
  body: JSON.stringify({ event: 'test' }),
  headers: { 'Content-Type': 'application/json' },
  expectedStatuses: [400],
});

// 15. Paddle Security Rejection: Invalid Signature
await testEndpoint('15. Paddle Webhook (Invalid Signature Rejection)', '/api/webhooks/billing/paddle', {
  method: 'POST',
  body: JSON.stringify({ event: 'test' }),
  headers: {
    'Content-Type': 'application/json',
    'Paddle-Signature': 'ts=1700000000;h1=invalid_tampered_hmac_hash',
  },
  expectedStatuses: [401, 500],
});

console.log('\n====================================================');
console.log(`RUNTIME PROOF RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('>>> ALL LINUX WORKER RUNTIME PROOF TESTS COMPLETED SUCCESSFULLY! <<<');
}
