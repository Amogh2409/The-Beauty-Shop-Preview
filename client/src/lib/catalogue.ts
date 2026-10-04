import type { AccountState, Product } from '../../../shared/src/types.js';

export const categories = [
  { key: 'All', title: 'All products', label: 'The collection' },
  { key: 'Face', title: 'Skincare', label: 'Face care' },
  { key: 'Hair', title: 'Haircare', label: 'Hair care' },
  { key: 'Body', title: 'Body care', label: 'Body care' },
  { key: 'Baby', title: 'Baby care', label: 'Baby care' },
  { key: 'Other', title: 'More to explore', label: 'More to explore' },
] as const;
export type Category = (typeof categories)[number]['key'];
const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
export const money = (amount: number) => moneyFormatter.format(amount);
export const displayName = (product: { name: string }) => product.name.replace(/&amp;/g, '&');
export const categoryOf = (product: Product): Category =>
  ['Face', 'Hair', 'Body', 'Baby'].includes(product.category ?? '')
    ? (product.category as Category)
    : 'Other';
export const hasMrp = (product: Product): product is Product & { historicalMrp: number } =>
  typeof product.historicalMrp === 'number' &&
  Number.isFinite(product.historicalMrp) &&
  product.historicalMrp > 0;
export const normalizeSearch = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(
      /(\d)\s*(ml|gm|g)\b/g,
      (_match, number: string, unit: string) => number + (unit === 'gm' ? 'g' : unit),
    )
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\.(?!\d)|(?<!\d)\./g, ' ')
    .trim();
const searchAliases: Record<string, string> = {
  'H2022-ME-R0261': 'almond conditioner',
  'H2022-ME-R0279': 'lip serum chocolate truffle',
};
export function searchText(product: Product): string {
  return normalizeSearch(
    [
      product.name,
      product.ean,
      product.id,
      product.brand,
      product.size,
      product.subcategory,
      product.shadeFragment,
      searchAliases[product.id],
    ].join(' '),
  );
}
export function matchesToken(haystack: string, token: string): boolean {
  return /^\d+(?:\.\d+)?(?:ml|g)$/.test(token)
    ? haystack.split(' ').includes(token)
    : haystack.includes(token);
}
export interface CartLine {
  product: Product;
  quantity: number;
}
export function cartLines(state: AccountState | null, byId: Map<string, Product>): CartLine[] {
  return Object.entries(state?.cart ?? {}).flatMap(([id, quantity]) => {
    const product = byId.get(id);
    return product && quantity > 0 ? [{ product, quantity }] : [];
  });
}
export interface UnavailableCartLine {
  id: string;
  quantity: number;
}
/** Keep deleted or unpublished entries visible until the customer removes them. */
export function unavailableCartLines(
  state: AccountState | null,
  byId: Map<string, Product>,
): UnavailableCartLine[] {
  return Object.entries(state?.cart ?? {})
    .filter(([id, quantity]) => !byId.has(id) && quantity > 0)
    .map(([id, quantity]) => ({ id, quantity }));
}
/** Public price values only; supplier costs never enter the storefront model. */
export function referenceUnitMinor(product: Product): number | null {
  const current = product.currentOffer?.sellingPriceMinor;
  if (typeof current === 'number' && Number.isSafeInteger(current) && current > 0) return current;
  return hasMrp(product) ? Math.round(product.historicalMrp * 100) : null;
}
export const hasReferencePrice = (product: Product) => referenceUnitMinor(product) !== null;
export const priceLabel = (product: Product) =>
  product.currentOffer
    ? 'Current selling price'
    : hasMrp(product)
      ? 'Historical MRP · 2022 reference'
      : 'Price pending';
export function verificationStatus(product: Product, now = Date.now()) {
  if (!product.currentOffer) return null;
  const stockTime = Date.parse(product.currentOffer.stockAsOf ?? '');
  const priceTime = Date.parse(product.currentOffer.verifiedAt);
  return {
    stale: !Number.isFinite(stockTime) || now - stockTime > 7 * 24 * 60 * 60 * 1000,
    stockDateKnown: Number.isFinite(stockTime),
    date: Number.isFinite(stockTime)
      ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(stockTime)
      : 'Unknown',
    priceDate: Number.isFinite(priceTime)
      ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(priceTime)
      : 'Unavailable',
  };
}
export function bagTotals(lines: CartLine[]) {
  const values = lines.reduce(
    (total, { product, quantity }) => {
      const unitMinor = referenceUnitMinor(product);
      return {
        units: total.units + quantity,
        subtotalMinor: total.subtotalMinor + (unitMinor ?? 0) * quantity,
        missing: total.missing + (unitMinor === null ? quantity : 0),
      };
    },
    { units: 0, subtotalMinor: 0, missing: 0 },
  );
  return { units: values.units, subtotal: values.subtotalMinor / 100, missing: values.missing };
}
export function enquiryText(lines: CartLine[]): string {
  return [
    'ENQUIRY DRAFT — NOT AN ORDER',
    'Please confirm current product variants, price and availability.',
    '',
    ...lines.map(
      ({ product, quantity }, index) =>
        `${index + 1}. ${displayName(product)}\nSource code: ${product.ean || 'Not supplied'} | Entry: ${product.id}\nRequested quantity: ${quantity}`,
    ),
    '',
    'Prices are labelled by source: historical 2022 references or imported current values. Please confirm current availability; nothing is reserved.',
  ].join('\n');
}
export const boundedQuantity = (value: string | number) =>
  Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
