import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AccountState, Product } from '../shared/src/types.js';
import {
  bagTotals,
  cartLines,
  unavailableCartLines,
  hasReferencePrice,
  priceLabel,
  referenceUnitMinor,
  verificationStatus,
} from '../client/src/lib/catalogue.js';
const historical: Product = {
  id: 'historical',
  name: 'Reference cream',
  brand: 'Reference',
  ean: '001',
  category: 'Face',
  subcategory: null,
  size: null,
  shadeFragment: null,
  historicalMrp: 199,
  sourceRow: 2,
  sourceKind: 'historical',
};
const current: Product = {
  ...historical,
  id: 'current',
  sourceKind: 'current',
  historicalMrp: null,
  currentOffer: {
    sellingPriceMinor: 15025,
    mrpMinor: 20000,
    availableQuantity: null,
    verifiedAt: '2026-10-04T00:00:00Z',
    stockAsOf: '2026-10-04',
  },
};
test('current selling prices and historical MRPs remain separately labelled', () => {
  assert.equal(referenceUnitMinor(historical), 19900);
  assert.equal(priceLabel(historical), 'Historical MRP · 2022 reference');
  assert.equal(referenceUnitMinor(current), 15025);
  assert.equal(priceLabel(current), 'Current selling price');
  assert.equal(hasReferencePrice({ ...historical, historicalMrp: null }), false);
});
test('mixed demo bags total integer paise without using MRP as current selling price', () => {
  assert.deepEqual(
    bagTotals([
      { product: historical, quantity: 2 },
      { product: current, quantity: 3 },
      { product: { ...historical, historicalMrp: null }, quantity: 1 },
    ]),
    { units: 6, subtotal: 848.75, missing: 1 },
  );
  assert.equal(current.currentOffer?.availableQuantity, null);
});
test('stale or missing verification dates warn rather than claiming fresh stock', () => {
  assert.equal(
    verificationStatus(
      {
        ...current,
        currentOffer: { ...current.currentOffer!, stockAsOf: '2026-09-01' },
      },
      Date.parse('2026-10-04T00:00:00Z'),
    )?.stale,
    true,
  );
  assert.equal(
    verificationStatus({
      ...current,
      currentOffer: { ...current.currentOffer!, stockAsOf: null },
    })?.stale,
    true,
  );
});

test('a newly verified price does not silently refresh an old stock snapshot', () => {
  const result = verificationStatus(
    {
      ...current,
      currentOffer: {
        ...current.currentOffer!,
        verifiedAt: '2026-10-04T00:00:00Z',
        stockAsOf: '2026-09-01',
      },
    },
    Date.parse('2026-10-04T00:00:00Z'),
  );
  assert.equal(result?.stale, true);
  assert.equal(result?.stockDateKnown, true);
});

test('rolled-back catalogue entries remain identifiable separately from known bag lines', () => {
  const state: AccountState = {
    cart: { [historical.id]: 2, 'rolled-back-entry': 3 },
    wishlist: ['rolled-back-entry'],
    recent: [],
    profile: { nickname: '' },
    addresses: [],
    orders: [],
    drafts: [],
  };
  const byId = new Map([[historical.id, historical]]);
  assert.equal(cartLines(state, byId).length, 1);
  assert.deepEqual(unavailableCartLines(state, byId), [{ id: 'rolled-back-entry', quantity: 3 }]);
  assert.deepEqual(unavailableCartLines({ ...state, cart: { 'rolled-back-entry': 3 } }, byId), [
    { id: 'rolled-back-entry', quantity: 3 },
  ]);
});
