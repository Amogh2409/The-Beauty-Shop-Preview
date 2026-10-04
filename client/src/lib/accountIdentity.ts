import type { Operation } from '../../../shared/src/types.js';

/** Retrying a save is allowed only for the customer who originally requested it. */
export interface PendingChange {
  userId: string;
  operation: Operation;
  requestId: string;
}
export function belongsToAccount(
  originUserId: string | null,
  currentUserId: string | null,
): boolean {
  return Boolean(originUserId && originUserId === currentUserId);
}
export function reconcileAccountIdentity(
  previousUserId: string | null,
  incomingUserId: string,
  pending: PendingChange | null,
) {
  const identityChanged = previousUserId !== null && previousUserId !== incomingUserId;
  const retainedPending =
    pending && belongsToAccount(pending.userId, incomingUserId) ? pending : null;
  return {
    identityChanged,
    pending: retainedPending,
    discardedPending: Boolean(pending && !retainedPending),
  };
}
export const changedAccountMessage =
  'The signed-in account changed. Unsaved changes from the previous account were discarded; review this account before making new changes.';
