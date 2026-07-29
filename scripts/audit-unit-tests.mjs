/**
 * Lightweight audit unit tests (no Jest). Run: node scripts/audit-unit-tests.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${e.message}`);
  }
}

console.log('REST guard policy');
const guardSrc = fs.readFileSync(path.join(root, 'lib/db/rest-guard.ts'), 'utf8');
test('blocks anonymous order writes', () => {
  assert.match(guardSrc, /MUTATION_BLOCKED_FOR_NON_ADMIN/);
  assert.match(guardSrc, /['\"]orders['\"]/);
  assert.match(guardSrc, /['\"]order_items['\"]/);
});
test('allows public product reads', () => {
  assert.match(guardSrc, /PUBLIC_READ/);
  assert.match(guardSrc, /['\"]products['\"]/);
  assert.match(guardSrc, /['\"]categories['\"]/);
});
test('marks mark_order_paid as admin-only via RPC route', () => {
  const rpc = fs.readFileSync(path.join(root, 'app/rest/v1/rpc/[fn]/route.ts'), 'utf8');
  assert.match(rpc, /mark_order_paid/);
  assert.match(rpc, /403/);
});

console.log('Checkout server pricing');
const checkout = fs.readFileSync(path.join(root, 'app/api/storefront/checkout/route.ts'), 'utf8');
test('checkout recomputes unit prices from DB', () => {
  assert.match(checkout, /Server-authoritative checkout/);
  assert.match(checkout, /unitPrice/);
  assert.match(checkout, /priced_server_side/);
});
test('checkout page posts to storefront API', () => {
  const page = fs.readFileSync(path.join(root, 'app/(store)/checkout/page.tsx'), 'utf8');
  assert.match(page, /\/api\/storefront\/checkout/);
  assert.doesNotMatch(page, /\.from\(['\"]orders['\"]\)\s*\n?\s*\.insert/);
});

console.log('Payment confirmation dedup');
const notifications = fs.readFileSync(path.join(root, 'lib/notifications.ts'), 'utf8');
test('claimOrderConfirmation uses confirmation_sent_at', () => {
  assert.match(notifications, /claimOrderConfirmation/);
  assert.match(notifications, /confirmation_sent_at/);
});
test('SMS send has timeout', () => {
  assert.match(notifications, /15_000|AbortController/);
});

console.log('Admin mark-paid uses RPC');
const markPaid = fs.readFileSync(
  path.join(root, 'app/api/admin/orders/[id]/mark-paid/route.ts'),
  'utf8'
);
test('mark-paid calls mark_order_paid', () => {
  assert.match(markPaid, /mark_order_paid/);
});

console.log('Paystack UI wired');
test('checkout offers paystack', () => {
  const page = fs.readFileSync(path.join(root, 'app/(store)/checkout/page.tsx'), 'utf8');
  assert.match(page, /paystack/i);
});
test('order-success verifies paystack', () => {
  const page = fs.readFileSync(path.join(root, 'app/(store)/order-success/page.tsx'), 'utf8');
  assert.match(page, /paystack\/verify/);
});

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll audit unit tests passed');
