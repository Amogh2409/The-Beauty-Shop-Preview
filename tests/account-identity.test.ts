import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  belongsToAccount,
  reconcileAccountIdentity,
  type PendingChange,
} from '../client/src/lib/accountIdentity.js';

const pending: PendingChange = {
  userId: 'alice',
  requestId: 'stable-request',
  operation: { type: 'wishToggle', id: 'product-1' },
};
test('an unchanged account retains the original request identity for explicit retry', () => {
  const result = reconcileAccountIdentity('alice', 'alice', pending);
  assert.equal(result.identityChanged, false);
  assert.equal(result.pending, pending);
  assert.equal(result.discardedPending, false);
  assert.equal(belongsToAccount(pending.userId, 'alice'), true);
});
test('Alice-to-Bob account reload discards the pending Alice operation', () => {
  const result = reconcileAccountIdentity('alice', 'bob', pending);
  assert.equal(result.identityChanged, true);
  assert.equal(result.pending, null);
  assert.equal(result.discardedPending, true);
  assert.equal(belongsToAccount(pending.userId, 'bob'), false);
});
test('signed-out or changed sessions cannot replay an owned operation', () => {
  assert.equal(belongsToAccount('alice', null), false);
  assert.equal(belongsToAccount(null, 'bob'), false);
  assert.equal(belongsToAccount(null, null), false);
  assert.equal(reconcileAccountIdentity(null, 'bob', pending).pending, null);
});
