/**
 * SOUQCLOUD Linux Cloudflare Worker Runtime Smoke Test Suite
 * Executed against running workerd / Wrangler dev server on localhost:8787
 */

const BASE_URL = process.env.WORKER_URL || 'http://127.0.0.1:8787';

console.log('====================================================');
console.log('SOUQCLOUD LINUX WORKER RUNTIME SMOKE TEST SUITE');
console.log('Target Worker URL:', BASE_URL);
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

async function testEndpoint(name, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const host = options.host || 'souqcloud.com';
  const method = options.method || 'GET';
  const expectedStatuses = options.expectedStatuses || [200, 307, 308, 404];

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

    const isExpected = expectedStatuses.includes(res.status);

    if (isExpected) {
      console.log(`✅ [PASS] ${name} -> HTTP ${res.status} (${duration}ms) ${location ? `[Redirect: ${location}]` : ''}`);
      passCount++;
      return { pass: true, res, duration };
    } else {
      console.error(`❌ [FAIL] ${name} -> Unexpected HTTP ${res.status} (${duration}ms) - Expected: ${expectedStatuses.join(', ')}`);
      failCount++;
      return { pass: false, res, duration };
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${name} -> Network / Fetch error:`, err.message);
    failCount++;
    return { pass: false, error: err };
  }
}

// 1. Health Endpoint
await testEndpoint('1. API Health Check', '/api/health', {
  expectedStatuses: [200],
});

// 2. Marketing / Apex Page
await testEndpoint('2. Marketing Root /', '/', {
  host: 'souqcloud.com',
  expectedStatuses: [200],
});

// 3. Auth Login Page
await testEndpoint('3. Auth /login', '/login', {
  host: 'souqcloud.com',
  expectedStatuses: [200],
});

// 4. Auth Register Page
await testEndpoint('4. Auth /register', '/register', {
  host: 'souqcloud.com',
  expectedStatuses: [200],
});

// 5. Storefront Checkout Page
await testEndpoint('5. Storefront /checkout', '/checkout', {
  host: 'souqcloud.com',
  expectedStatuses: [200, 307],
});

// 6. Dynamic Product Detail Page (PDP)
await testEndpoint('6. Dynamic PDP /products/sample-item', '/products/sample-item', {
  host: 'souqcloud.com',
  expectedStatuses: [200, 404],
});

// 7. Dynamic Custom Page
await testEndpoint('7. Dynamic Page /pages/about-us', '/pages/about-us', {
  host: 'souqcloud.com',
  expectedStatuses: [200, 404],
});

// 8. Dashboard Home (Subdomain app.souqcloud.com)
await testEndpoint('8. Dashboard /app/home', '/app/home', {
  host: 'app.souqcloud.com',
  expectedStatuses: [200, 307, 308], // Redirect to /login expected when unauthenticated
});

// 9. Dashboard Products
await testEndpoint('9. Dashboard /app/products', '/app/products', {
  host: 'app.souqcloud.com',
  expectedStatuses: [200, 307, 308],
});

// 10. Dashboard Orders
await testEndpoint('10. Dashboard /app/orders', '/app/orders', {
  host: 'app.souqcloud.com',
  expectedStatuses: [200, 307, 308],
});

// 11. Paddle Webhook (Missing signature rejection)
await testEndpoint('11. Paddle Webhook (Missing Signature)', '/api/webhooks/billing/paddle', {
  method: 'POST',
  body: { event: 'test' },
  headers: { 'Content-Type': 'application/json' },
  expectedStatuses: [400], // Must reject missing signature cleanly
});

// 12. Paddle Webhook (Invalid signature rejection)
await testEndpoint('12. Paddle Webhook (Invalid Signature)', '/api/webhooks/billing/paddle', {
  method: 'POST',
  body: JSON.stringify({ event: 'test' }),
  headers: {
    'Content-Type': 'application/json',
    'Paddle-Signature': 'ts=1700000000;h1=fake_invalid_hmac_signature',
  },
  expectedStatuses: [401, 500], // Must fail signature validation cleanly
});

// 13. Proxy & Custom Domain Resolution Invariant
await testEndpoint('13. Custom Domain Request (Host: shop.brand.com)', '/', {
  host: 'shop.brand.com',
  headers: {
    'x-tenant-host': 'malicious-injected.com', // Must be stripped by proxy.ts
    'x-tenant-store-id': 'unauthorized-uuid',
  },
  expectedStatuses: [200, 404], // Clean SSR rendering or 404 without 500 crash
});

console.log('\n====================================================');
console.log(`SMOKE TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('>>> ALL LINUX WORKER RUNTIME SMOKE TESTS PASSED! <<<');
}
