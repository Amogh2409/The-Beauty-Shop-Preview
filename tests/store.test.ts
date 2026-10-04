import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOperation, emptyState, InputError } from '../shared/src/store.js';
import catalogue from '../shared/data/catalogue.json' with { type: 'json' };
import type { AccountState } from '../shared/src/types.js';
const product = catalogue.find((product) => (product.historicalMrp ?? 0) > 0)!;
const now = '2026-10-04T12:00:00.000Z';
let sequence = 0;
const uid = () => `fixture-${String(++sequence).padStart(16, '0')}`;
const apply = (state: AccountState, operation: unknown) =>
  applyOperation(state, operation, now, uid);
const address = {
  label: 'Example home',
  recipient: 'Sample Customer',
  line: '123 Sample Lane',
  city: 'Jhansi',
  region: 'Uttar Pradesh',
  pincode: '284001',
};
function prepared(): AccountState {
  let state = apply(emptyState(), { type: 'cartAdd', id: product.id, quantity: 2 }).state;
  return apply(state, { type: 'addressSave', address }).state;
}
test('277 unique historical source rows and public fields are preserved', () => {
  assert.equal(catalogue.length, 277);
  assert.equal(new Set(catalogue.map((product) => product.id)).size, 277);
  for (const item of catalogue)
    assert.deepEqual(
      Object.keys(item).sort(),
      [
        'id',
        'name',
        'brand',
        'ean',
        'category',
        'subcategory',
        'size',
        'shadeFragment',
        'historicalMrp',
        'sourceRow',
      ].sort(),
    );
});
test('quantity validation, upper bound and unknown IDs cannot corrupt state', () => {
  const initial = apply(emptyState(), { type: 'cartAdd', id: product.id, quantity: 99 }).state;
  assert.equal(
    apply(initial, { type: 'cartAdd', id: product.id, quantity: 3 }).state.cart[product.id],
    99,
  );
  for (const quantity of [-1, 0.5, 100, '2', Infinity])
    assert.throws(() => apply(initial, { type: 'cartSet', id: product.id, quantity }), InputError);
  assert.throws(() => apply(initial, { type: 'cartAdd', id: 'unlisted', quantity: 1 }), InputError);
  assert.equal(
    Object.keys(apply(initial, { type: 'cartSet', id: product.id, quantity: 0 }).state.cart).length,
    0,
  );
});
test('bulk mutations are atomic and relative quantity changes do not overwrite each other', () => {
  const initial = prepared();
  assert.throws(
    () =>
      apply(initial, {
        type: 'cartAddMany',
        items: [
          { id: product.id, quantity: 2 },
          { id: 'bad', quantity: 1 },
        ],
      }),
    InputError,
  );
  assert.equal(initial.cart[product.id], 2);
  const changed = apply(apply(initial, { type: 'cartAdjust', id: product.id, delta: 1 }).state, {
    type: 'cartAdjust',
    id: product.id,
    delta: 1,
  }).state;
  assert.equal(changed.cart[product.id], 4);
});
test('wishlist, recent views and legacy import stay bounded and independent', () => {
  let state = apply(prepared(), { type: 'saveLater', id: product.id }).state;
  assert.deepEqual(state.wishlist, [product.id]);
  assert.equal(Object.keys(state.cart).length, 0);
  for (const item of catalogue.slice(0, 20))
    state = apply(state, { type: 'recentAdd', id: item.id }).state;
  assert.equal(state.recent.length, 12);
  state = apply(state, {
    type: 'legacyImport',
    cart: { [product.id]: 3 },
    wishlist: [product.id],
  }).state;
  assert.equal(state.wishlist.length, 1);
  assert.equal(state.cart[product.id], 3);
});
test('address defaults are preserved; edits do not mutate order snapshots', () => {
  let state = prepared();
  const firstAddress = state.addresses[0];
  assert.equal(firstAddress.isDefault, true);
  assert.throws(
    () => apply(state, { type: 'addressSave', address: { ...address, pincode: 'bad' } }),
    InputError,
  );
  state = apply(state, {
    type: 'demoOrderCreate',
    requestKey: 'snapshot',
    acknowledged: true,
    method: 'delivery',
    addressId: firstAddress.id,
  }).state;
  state = apply(state, { type: 'addressRemove', id: firstAddress.id }).state;
  assert.equal(state.orders[0].address?.line, address.line);
});
test('demo checkout uses integer reference paise, DEMO10, acknowledgment and stable request key', () => {
  const state = prepared();
  assert.throws(
    () =>
      apply(state, {
        type: 'demoOrderCreate',
        requestKey: 'order1',
        acknowledged: false,
        method: 'pickup',
      }),
    /Confirm/,
  );
  const operation = {
    type: 'demoOrderCreate',
    requestKey: 'order1',
    acknowledged: true,
    method: 'pickup',
    coupon: 'DEMO10',
  };
  const result = apply(state, operation);
  const order = result.state.orders[0];
  assert.equal(order.subtotalMinor, Math.round(product.historicalMrp! * 100) * 2);
  assert.equal(order.discountMinor, Math.round(order.subtotalMinor * 0.1));
  assert.equal(order.referenceYear, 2022);
  assert.equal(order.currency, 'INR');
  assert.equal(apply(result.state, operation).result.orderId, order.id);
  assert.equal(Object.keys(result.state.cart).length, 0);
});
test('price-pending entries cannot become free demo orders', () => {
  const missing = catalogue.find((product) => !product.historicalMrp)!;
  const state = apply(prepared(), { type: 'cartAdd', id: missing.id, quantity: 1 }).state;
  assert.throws(
    () =>
      apply(state, {
        type: 'demoOrderCreate',
        requestKey: 'blocked',
        acknowledged: true,
        method: 'pickup',
      }),
    /price-pending/,
  );
});
test('demo order lifecycle rejects stale transitions and inappropriate cancellation/returns', () => {
  let state = apply(prepared(), {
    type: 'demoOrderCreate',
    requestKey: 'life',
    acknowledged: true,
    method: 'pickup',
  }).state;
  const id = state.orders[0].id;
  assert.throws(
    () => apply(state, { type: 'demoReturnDraft', id, reason: 'Example' }),
    /after demo delivery/,
  );
  state = apply(state, { type: 'demoOrderAdvance', id, expectedStatus: 'created' }).state;
  assert.throws(
    () => apply(state, { type: 'demoOrderAdvance', id, expectedStatus: 'created' }),
    /already changed/,
  );
  state = apply(state, { type: 'demoOrderAdvance', id }).state;
  assert.throws(() => apply(state, { type: 'demoOrderCancel', id }), /created or packed/);
  state = apply(state, { type: 'demoOrderAdvance', id }).state;
  state = apply(state, { type: 'demoReturnDraft', id, reason: 'Example issue' }).state;
  assert.equal(state.orders[0].returnDraft?.status, 'draft-not-submitted');
  assert.throws(
    () => apply(state, { type: 'demoReturnDraft', id, reason: 'Again' }),
    /already saved/,
  );
});
test('created demo orders can be cancelled and cannot advance afterwards', () => {
  let state = apply(prepared(), {
    type: 'demoOrderCreate',
    requestKey: 'cancel',
    acknowledged: true,
    method: 'pickup',
  }).state;
  const id = state.orders[0].id;
  state = apply(state, { type: 'demoOrderCancel', id }).state;
  assert.equal(state.orders[0].status, 'cancelled');
  assert.throws(() => apply(state, { type: 'demoOrderAdvance', id }), /cannot advance/);
});
test('50,000-character draft edit and deletion preserve non-submitted semantics', () => {
  let state = apply(emptyState(), {
    type: 'draftSave',
    kind: 'business',
    subject: 'Availability',
    message: 'a'.repeat(40000),
  }).state;
  const id = state.drafts[0].id;
  state = apply(state, {
    type: 'draftUpdate',
    id,
    subject: 'Updated',
    message: 'b'.repeat(50000),
  }).state;
  assert.equal(state.drafts.length, 1);
  assert.equal(state.drafts[0].message.length, 50000);
  assert.equal(state.drafts[0].status, 'not-submitted');
  assert.throws(
    () => apply(state, { type: 'draftUpdate', id, subject: 'x', message: 'a'.repeat(50001) }),
    InputError,
  );
  assert.equal(apply(state, { type: 'draftDelete', id }).state.drafts.length, 0);
});
test('malformed, unknown and privilege-like extra fields are rejected', () => {
  for (const operation of [
    null,
    [],
    { type: 'admin' },
    { type: 'profileSave', nickname: 'x', userId: 'other-user' },
  ])
    assert.throws(() => apply(emptyState(), operation), InputError);
});

test('approved current records participate in bag and demo checkout without historical labels', () => {
  const current = {
    ...product,
    id: 'CURRENT-test-product',
    historicalMrp: null,
    sourceKind: 'current' as const,
    currentOffer: {
      sellingPriceMinor: 12050,
      mrpMinor: 15000,
      availableQuantity: 10,
      verifiedAt: now,
    },
  };
  const added = applyOperation(
    emptyState(),
    { type: 'cartAdd', id: current.id, quantity: 2 },
    now,
    uid,
    [current],
  ).state;
  const ordered = applyOperation(
    added,
    { type: 'demoOrderCreate', requestKey: 'current-order', acknowledged: true, method: 'pickup' },
    now,
    uid,
    [current],
  ).state.orders[0];
  assert.equal(ordered.subtotalMinor, 24100);
  assert.equal(ordered.referenceYear, null);
  assert.equal(ordered.lines[0].priceBasis, 'current');
});
test('removed imported records can be removed from saved bag and wishlist without losing valid entries', () => {
  const state = prepared();
  state.cart['CURRENT-removed'] = 3;
  state.wishlist = ['CURRENT-removed', product.id];
  const cleaned = apply(
    apply(state, { type: 'cartSet', id: 'CURRENT-removed', quantity: 0 }).state,
    { type: 'wishToggle', id: 'CURRENT-removed' },
  ).state;
  assert.equal(cleaned.cart[product.id], 2);
  assert.equal(cleaned.cart['CURRENT-removed'], undefined);
  assert.deepEqual(cleaned.wishlist, [product.id]);
  assert.throws(
    () => apply(cleaned, { type: 'cartAdd', id: 'CURRENT-removed', quantity: 1 }),
    InputError,
  );
});
