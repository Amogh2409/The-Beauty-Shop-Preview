import { z } from 'zod';
import catalogueData from '../data/catalogue.json' with { type: 'json' };
import type {
  AccountState,
  Address,
  DemoOrder,
  Operation,
  OperationResult,
  OrderStatus,
  Product,
} from './types.js';

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}
const fail = (message: string): never => {
  throw new InputError(message);
};
const catalogue: Product[] = catalogueData;
const products = new Map(catalogue.map((product) => [product.id, product]));
const id = z.string().min(1).max(100);
const quantity = z.number().int().min(0).max(99);
const requiredText = (maximum: number) => z.string().max(maximum).trim().min(1);
const orderStatus = z.enum(['created', 'packed', 'dispatched', 'delivered', 'cancelled']);
const operationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cartSet'), id, quantity }).strict(),
  z.object({ type: z.literal('cartAdd'), id, quantity: quantity.min(1) }).strict(),
  z
    .object({ type: z.literal('cartAdjust'), id, delta: z.union([z.literal(-1), z.literal(1)]) })
    .strict(),
  z
    .object({
      type: z.literal('cartAddMany'),
      items: z
        .array(z.object({ id, quantity: quantity.min(1) }).strict())
        .min(1)
        .max(30),
    })
    .strict(),
  z.object({ type: z.literal('saveLater'), id }).strict(),
  z.object({ type: z.literal('wishToggle'), id }).strict(),
  z.object({ type: z.literal('recentAdd'), id }).strict(),
  z.object({ type: z.literal('profileSave'), nickname: z.string().max(60).trim() }).strict(),
  z
    .object({
      type: z.literal('addressSave'),
      address: z
        .object({
          id: id.optional(),
          label: requiredText(30),
          recipient: requiredText(60),
          line: requiredText(120),
          city: requiredText(60),
          region: requiredText(60),
          pincode: z.string().regex(/^[1-9][0-9]{5}$/),
          isDefault: z.boolean().optional(),
        })
        .strict(),
    })
    .strict(),
  z.object({ type: z.literal('addressRemove'), id }).strict(),
  z.object({ type: z.literal('addressDefault'), id }).strict(),
  z
    .object({
      type: z.literal('demoOrderCreate'),
      requestKey: requiredText(80),
      acknowledged: z.boolean(),
      method: z.enum(['delivery', 'pickup']),
      addressId: id.optional(),
      coupon: z.enum(['', 'DEMO10']).optional(),
    })
    .strict(),
  z
    .object({ type: z.literal('demoOrderAdvance'), id, expectedStatus: orderStatus.optional() })
    .strict(),
  z.object({ type: z.literal('demoOrderCancel'), id }).strict(),
  z.object({ type: z.literal('demoReturnDraft'), id, reason: requiredText(300) }).strict(),
  z
    .object({
      type: z.literal('draftSave'),
      kind: z.enum(['support', 'business']),
      subject: requiredText(120),
      message: requiredText(50000),
    })
    .strict(),
  z
    .object({
      type: z.literal('draftUpdate'),
      id,
      subject: requiredText(120),
      message: requiredText(50000),
    })
    .strict(),
  z.object({ type: z.literal('draftDelete'), id }).strict(),
  z
    .object({
      type: z.literal('legacyImport'),
      cart: z.record(quantity).refine((value) => Object.keys(value).length <= 277),
      wishlist: z.array(id).max(277),
    })
    .strict(),
]);

export function emptyState(): AccountState {
  return {
    cart: {},
    wishlist: [],
    recent: [],
    profile: { nickname: '' },
    addresses: [],
    orders: [],
    drafts: [],
  };
}
function findProduct(productId: string, lookup: ReadonlyMap<string, Product> = products): Product {
  return lookup.get(productId) ?? fail('This catalogue entry is unavailable.');
}
function findOrder(state: AccountState, orderId: string): DemoOrder {
  return state.orders.find((order) => order.id === orderId) ?? fail('Demo order not found.');
}
function ensureDefaultAddress(state: AccountState): void {
  if (state.addresses.length && !state.addresses.some((address) => address.isDefault))
    state.addresses[0].isDefault = true;
}
function saveAddress(
  state: AccountState,
  operation: Extract<Operation, { type: 'addressSave' }>,
  uid: () => string,
): void {
  const input = operation.address;
  if (input.id && !state.addresses.some((address) => address.id === input.id))
    fail('Address not found.');
  if (!input.id && state.addresses.length >= 12) fail('You can save up to 12 demo addresses.');
  const address: Address = {
    ...input,
    id: input.id ?? uid(),
    isDefault: input.isDefault === true || state.addresses.length === 0,
  };
  state.addresses = state.addresses
    .filter((existing) => existing.id !== address.id)
    .map((existing) => (address.isDefault ? { ...existing, isDefault: false } : existing));
  state.addresses.push(address);
  ensureDefaultAddress(state);
}
function createDemoOrder(
  state: AccountState,
  operation: Extract<Operation, { type: 'demoOrderCreate' }>,
  now: string,
  uid: () => string,
  lookup: ReadonlyMap<string, Product>,
): OperationResult {
  const prior = state.orders.find((order) => order.requestKey === operation.requestKey);
  if (prior) return { orderId: prior.id };
  if (!operation.acknowledged) fail('Confirm that this is a demo order only.');
  const address = state.addresses.find((candidate) => candidate.id === operation.addressId);
  if (operation.method === 'delivery' && !address) fail('Select a saved demo address.');
  const lines = Object.entries(state.cart).map(([productId, count]) => {
    const product = findProduct(productId, lookup);
    if (!Number.isInteger(count) || count < 1 || count > 99) fail('Invalid saved bag quantity.');
    const currentPrice = product.currentOffer?.sellingPriceMinor;
    const unitMinor =
      currentPrice ??
      (product.historicalMrp === null ? null : Math.round(product.historicalMrp * 100));
    if (unitMinor === null || !Number.isSafeInteger(unitMinor) || unitMinor <= 0)
      throw new InputError('Remove price-pending entries before creating a demo order.');
    const priceBasis = currentPrice === undefined ? ('historical' as const) : ('current' as const);
    return {
      id: productId,
      name: product.name,
      ean: product.ean,
      quantity: count,
      unitMinor,
      priceBasis,
    };
  });
  if (!lines.length) fail('Your bag is empty.');
  if (state.orders.length >= 40) fail('This preview holds up to 40 demo orders.');
  const subtotalMinor = lines.reduce((total, line) => total + line.quantity * line.unitMinor, 0);
  const discountMinor = operation.coupon === 'DEMO10' ? Math.round(subtotalMinor * 0.1) : 0;
  const order: DemoOrder = {
    id: `DEMO-${uid().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
    requestKey: operation.requestKey,
    createdAt: now,
    currency: 'INR',
    referenceYear: lines.every((line) => line.priceBasis === 'historical') ? 2022 : null,
    lines,
    subtotalMinor,
    discountMinor,
    exampleMerchandiseMinor: subtotalMinor - discountMinor,
    coupon: operation.coupon ?? '',
    method: operation.method,
    address: operation.method === 'delivery' && address ? structuredClone(address) : null,
    status: 'created',
    events: [{ status: 'created', at: now }],
    returnDraft: null,
  };
  state.orders.unshift(order);
  state.cart = {};
  return { orderId: order.id };
}

/** Pure account transition. Parsing and cloning precede mutation; a failed operation cannot partly save. */
export function applyOperation(
  current: AccountState,
  input: unknown,
  now = new Date().toISOString(),
  uid: () => string = () => crypto.randomUUID(),
  currentProducts: readonly Product[] = [],
): { state: AccountState; result: OperationResult } {
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success)
    throw new InputError(
      `Please check the form: ${parsed.error.issues[0]?.message ?? 'invalid action'}.`,
    );
  const operation: Operation = parsed.data;
  const lookup = new Map([
    ...products,
    ...currentProducts.map((product) => [product.id, product] as const),
  ]);
  const state = structuredClone(current);
  let result: OperationResult = {};
  switch (operation.type) {
    case 'cartSet':
      if (operation.quantity === 0) delete state.cart[operation.id];
      else {
        findProduct(operation.id, lookup);
        state.cart[operation.id] = operation.quantity;
      }
      break;
    case 'cartAdd':
      findProduct(operation.id, lookup);
      state.cart[operation.id] = Math.min(99, (state.cart[operation.id] ?? 0) + operation.quantity);
      break;
    case 'cartAdjust':
      findProduct(operation.id, lookup);
      if (!state.cart[operation.id]) fail('This entry is no longer in your bag.');
      state.cart[operation.id] = Math.max(
        1,
        Math.min(99, state.cart[operation.id] + operation.delta),
      );
      break;
    case 'cartAddMany':
      for (const item of operation.items) {
        findProduct(item.id, lookup);
        state.cart[item.id] = Math.min(99, (state.cart[item.id] ?? 0) + item.quantity);
      }
      break;
    case 'saveLater':
      findProduct(operation.id, lookup);
      delete state.cart[operation.id];
      if (!state.wishlist.includes(operation.id)) state.wishlist.push(operation.id);
      break;
    case 'wishToggle':
      if (state.wishlist.includes(operation.id))
        state.wishlist = state.wishlist.filter((id) => id !== operation.id);
      else {
        findProduct(operation.id, lookup);
        state.wishlist.push(operation.id);
      }
      break;
    case 'recentAdd':
      findProduct(operation.id, lookup);
      state.recent = [operation.id, ...state.recent.filter((id) => id !== operation.id)].slice(
        0,
        12,
      );
      break;
    case 'profileSave':
      state.profile = { nickname: operation.nickname };
      break;
    case 'addressSave':
      saveAddress(state, operation, uid);
      break;
    case 'addressRemove':
      if (!state.addresses.some((address) => address.id === operation.id))
        fail('Address not found.');
      state.addresses = state.addresses.filter((address) => address.id !== operation.id);
      ensureDefaultAddress(state);
      break;
    case 'addressDefault':
      if (!state.addresses.some((address) => address.id === operation.id))
        fail('Address not found.');
      state.addresses = state.addresses.map((address) => ({
        ...address,
        isDefault: address.id === operation.id,
      }));
      break;
    case 'demoOrderCreate':
      result = createDemoOrder(state, operation, now, uid, lookup);
      break;
    case 'demoOrderAdvance': {
      const order = findOrder(state, operation.id);
      if (operation.expectedStatus !== undefined && operation.expectedStatus !== order.status)
        fail('This demo tracking step already changed. Reload before advancing again.');
      const nextStatuses: Partial<Record<OrderStatus, OrderStatus>> = {
        created: 'packed',
        packed: 'dispatched',
        dispatched: 'delivered',
      };
      const next = nextStatuses[order.status] ?? fail('This demo cannot advance further.');
      order.status = next;
      order.events.push({ status: next, at: now });
      break;
    }
    case 'demoOrderCancel': {
      const order = findOrder(state, operation.id);
      if (order.status !== 'created' && order.status !== 'packed')
        fail('Only a created or packed demo order can be cancelled.');
      order.status = 'cancelled';
      order.events.push({ status: 'cancelled', at: now });
      break;
    }
    case 'demoReturnDraft': {
      const order = findOrder(state, operation.id);
      if (order.status !== 'delivered') fail('Return drafts are available after demo delivery.');
      if (order.returnDraft) fail('A return draft is already saved.');
      order.returnDraft = {
        reason: operation.reason,
        createdAt: now,
        status: 'draft-not-submitted',
      };
      break;
    }
    case 'draftSave':
      if (state.drafts.length >= 30) fail('This preview holds up to 30 enquiry drafts.');
      state.drafts.unshift({
        id: uid(),
        kind: operation.kind,
        subject: operation.subject,
        message: operation.message,
        createdAt: now,
        status: 'not-submitted',
      });
      break;
    case 'draftUpdate': {
      const draft =
        state.drafts.find((draft) => draft.id === operation.id) ?? fail('Draft not found.');
      draft.subject = operation.subject;
      draft.message = operation.message;
      draft.updatedAt = now;
      break;
    }
    case 'draftDelete':
      if (!state.drafts.some((draft) => draft.id === operation.id)) fail('Draft not found.');
      state.drafts = state.drafts.filter((draft) => draft.id !== operation.id);
      break;
    case 'legacyImport':
      for (const [productId, count] of Object.entries(operation.cart)) {
        findProduct(productId, lookup);
        if (count) state.cart[productId] = Math.max(count, state.cart[productId] ?? 0);
      }
      for (const productId of operation.wishlist) {
        findProduct(productId, lookup);
        if (!state.wishlist.includes(productId)) state.wishlist.push(productId);
      }
      break;
  }
  return { state, result };
}
