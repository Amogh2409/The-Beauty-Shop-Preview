/** Public historical catalogue fields. Commercial cost/margin data is intentionally absent. */
export interface Product {
  id: string;
  name: string;
  brand: string;
  ean: string;
  category: string | null;
  subcategory: string | null;
  size: string | null;
  shadeFragment: string | null;
  historicalMrp: number | null;
  sourceRow: number;
  sourceKind?: 'historical' | 'current';
  currentOffer?: {
    sellingPriceMinor: number;
    mrpMinor: number | null;
    availableQuantity: number | null;
    verifiedAt: string;
    stockAsOf?: string | null;
  };
}
export interface ProductPhoto {
  localPath: string;
  sourceUrl?: string;
}
export interface User {
  id: string;
  email: string;
  displayName: string;
  role?: 'customer' | 'admin';
}
export interface Address {
  id: string;
  label: string;
  recipient: string;
  line: string;
  city: string;
  region: string;
  pincode: string;
  isDefault: boolean;
}
export type AddressInput = Omit<Address, 'id' | 'isDefault'> & { id?: string; isDefault?: boolean };
export type OrderStatus = 'created' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';
export interface OrderLine {
  id: string;
  name: string;
  ean: string;
  quantity: number;
  unitMinor: number;
  priceBasis?: 'historical' | 'current';
}
export interface DemoOrder {
  id: string;
  requestKey: string;
  createdAt: string;
  currency: 'INR';
  referenceYear: 2022 | null;
  lines: OrderLine[];
  subtotalMinor: number;
  discountMinor: number;
  exampleMerchandiseMinor: number;
  coupon: string;
  method: 'delivery' | 'pickup';
  address: Address | null;
  status: OrderStatus;
  events: { status: OrderStatus; at: string }[];
  returnDraft: { reason: string; createdAt: string; status: 'draft-not-submitted' } | null;
}
export type DraftKind = 'support' | 'business';
export interface EnquiryDraft {
  id: string;
  kind: DraftKind;
  subject: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
  status: 'not-submitted';
}
export interface AccountState {
  cart: Record<string, number>;
  wishlist: string[];
  recent: string[];
  profile: { nickname: string };
  addresses: Address[];
  orders: DemoOrder[];
  drafts: EnquiryDraft[];
}
export type Operation =
  | { type: 'cartSet' | 'cartAdd'; id: string; quantity: number }
  | { type: 'cartAdjust'; id: string; delta: -1 | 1 }
  | { type: 'cartAddMany'; items: { id: string; quantity: number }[] }
  | { type: 'saveLater' | 'wishToggle' | 'recentAdd'; id: string }
  | { type: 'profileSave'; nickname: string }
  | { type: 'addressSave'; address: AddressInput }
  | { type: 'addressRemove' | 'addressDefault'; id: string }
  | {
      type: 'demoOrderCreate';
      requestKey: string;
      acknowledged: boolean;
      method: 'delivery' | 'pickup';
      addressId?: string;
      coupon?: string;
    }
  | { type: 'demoOrderAdvance'; id: string; expectedStatus?: OrderStatus }
  | { type: 'demoOrderCancel'; id: string }
  | { type: 'demoReturnDraft'; id: string; reason: string }
  | { type: 'draftSave'; kind: DraftKind; subject: string; message: string }
  | { type: 'draftUpdate'; id: string; subject: string; message: string }
  | { type: 'draftDelete'; id: string }
  | { type: 'legacyImport'; cart: Record<string, number>; wishlist: string[] };
export type OperationResult = { orderId?: string };
export interface AccountResponse {
  user: User;
  state: AccountState;
  revision: number;
  csrfToken: string;
}
export interface MutationResponse {
  state: AccountState;
  revision: number;
  result: OperationResult;
}
