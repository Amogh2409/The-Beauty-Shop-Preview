import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import type {
  AccountState,
  Address,
  AddressInput,
  DemoOrder,
  Operation,
  OrderStatus,
  Product,
} from '@shared/types';
import { useStore } from '../context/StoreContext';
import { CopyButton, DemoBanner, PageHeading, ProductGrid } from '../components/Common';
import { DraftForm } from '../components/DraftForm';
import { displayName, money } from '../lib/catalogue';

const accountMenu = [
  ['overview', 'Overview'],
  ['orders', 'Demo orders'],
  ['addresses', 'Demo addresses'],
  ['wishlist', 'Wishlist'],
  ['recent', 'Recently viewed'],
  ['drafts', 'Enquiry drafts'],
  ['profile', 'Profile & privacy'],
] as const;

const statuses: Record<OrderStatus, string> = {
  created: 'Demo created',
  packed: 'Demo packed',
  dispatched: 'Demo dispatched',
  delivered: 'Demo delivered',
  cancelled: 'Demo cancelled',
};

export const sampleAddress: AddressInput = {
  label: 'Example home',
  recipient: 'Sample Customer',
  line: '123 Sample Lane',
  city: 'Jhansi',
  region: 'Uttar Pradesh',
  pincode: '284001',
  isDefault: true,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Guard each form locally as well as through the account mutation queue. */
function useAccountAction() {
  const { busy, ready, pending, mutate, notify } = useStore();
  const locked = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function run(operation: Operation, successMessage: string) {
    if (locked.current || busy || !ready || pending) return null;
    locked.current = true;
    setSubmitting(true);
    setFeedback('');
    try {
      const result = await mutate(operation);
      if (result) notify(successMessage);
      else setFeedback('This change was not saved. Review the account message and try again.');
      return result;
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'This change was not saved. Please try again.',
      );
      return null;
    } finally {
      locked.current = false;
      setSubmitting(false);
    }
  }

  return {
    run,
    disabled: busy || submitting || !ready || Boolean(pending),
    feedback,
  };
}

function AccountLayout({ tab, children }: { tab: string; children: ReactNode }) {
  const { state, user, busy, logout } = useStore();
  const [signingOut, setSigningOut] = useState(false);
  if (!state || !user) return null;
  const name = state.profile.nickname || user.displayName || 'Customer';

  async function signOut() {
    if (signingOut || busy) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="YOUR ACCOUNT"
        title={`Hello${state.profile.nickname ? `, ${state.profile.nickname}` : ''}.`}
      >
        Demo identity · Saved only in this browser
      </PageHeading>
      <section className="account-layout">
        <aside className="account-sidebar">
          <div className="account-person">
            <span className="account-monogram">{name.slice(0, 1)}</span>
            <strong>{name}</strong>
            <span>{user.email}</span>
          </div>
          <nav aria-label="Account navigation">
            {accountMenu.map(([key, label]) => (
              <a
                key={key}
                href={`#/${key === 'wishlist' ? 'wishlist' : `account/${key}`}`}
                aria-current={key === tab ? 'page' : undefined}
              >
                {label}
                {key === 'orders' && <span>{state.orders.length}</span>}
              </a>
            ))}

          </nav>
          <button
            className="signout-link"
            type="button"
            disabled={busy || signingOut}
            onClick={() => void signOut()}
          >
            {signingOut ? 'Signing out…' : 'Leave demo identity'}
          </button>
        </aside>
        <div className="account-content">{children}</div>
      </section>
    </>
  );
}

function AccountOverview({ state }: { state: AccountState }) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR BEAUTY SPACE</p>
          <h2>Everything in one place.</h2>
        </div>
      </div>
      <div className="account-stats">
        <a href="#/account/orders">
          <strong>{state.orders.length}</strong>
          <span>Demo orders</span>
        </a>
        <a href="#/wishlist">
          <strong>{state.wishlist.length}</strong>
          <span>Saved favourites</span>
        </a>
        <a href="#/account/addresses">
          <strong>{state.addresses.length}</strong>
          <span>Demo addresses</span>
        </a>
      </div>
      <DemoBanner />
      <div className="account-panel">
        <h3>Pick up where you left off.</h3>
        <p>
          Your bag and wishlist are saved only in this browser. Demo orders are practice records, not
          purchases.
        </p>
        <div className="button-row">
          <a className="button primary" href="#/cart">
            View your bag
          </a>
          <a className="button secondary" href="#/shop">
            Explore the collection
          </a>
        </div>
      </div>
      {state.orders[0] && (
        <>
          <h3 className="panel-title">Latest demo order</h3>
          <OrderCard order={state.orders[0]} />
        </>
      )}

    </>
  );
}

interface AddressCardProps {
  address: Address;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDefault?: () => void;
  onRemove?: () => void;
}

export function AddressCard({
  address,
  selectable = false,
  selected = false,
  disabled = false,
  onSelect,
  onEdit,
  onDefault,
  onRemove,
}: AddressCardProps) {
  const content = (
    <>
      {selectable && (
        <input
          type="radio"
          name="addressId"
          value={address.id}
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
        />
      )}
      <div>
        <div className="address-card-title">
          <strong>{address.label}</strong>
          {address.isDefault && <span className="status-pill">Default</span>}
        </div>
        <p>
          {address.recipient}
          <br />
          {address.line}
          <br />
          {address.city}, {address.region} {address.pincode}
        </p>
        <span className="small-note">Demo address · test data</span>
        {!selectable && (onEdit || onDefault || onRemove) && (
          <div className="link-row">
            {onEdit && (
              <button
                type="button"
                disabled={disabled}
                onClick={onEdit}
                aria-label={`Edit demo address ${address.label}`}
              >
                Edit
              </button>
            )}
            {!address.isDefault && onDefault && (
              <button
                type="button"
                disabled={disabled}
                onClick={onDefault}
                aria-label={`Make ${address.label} the default demo address`}
              >
                Make default
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                disabled={disabled}
                onClick={onRemove}
                aria-label={`Remove demo address ${address.label}`}
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
  const className = `address-card${selected ? ' selected' : ''}`;
  return selectable ? (
    <label className={className}>{content}</label>
  ) : (
    <article className={className}>{content}</article>
  );
}

function AddressForm({
  address,
  onSaved,
  onCancel,
}: {
  address?: Address;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const action = useAccountAction();
  const [fields, setFields] = useState<AddressInput>(
    address || {
      label: '',
      recipient: '',
      line: '',
      city: '',
      region: '',
      pincode: '',
      isDefault: false,
    },
  );

  function setField<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.run({ type: 'addressSave', address: fields }, 'Demo address saved')) onSaved();
  }

  return (
    <form
      className="account-panel form-grid"
      data-form="address"
      onSubmit={(event) => void submit(event)}
    >
      <input name="id" type="hidden" value={address?.id || ''} />
      <h3>{address ? 'Edit' : 'Add'} a demo address</h3>
      <p className="form-note">Use fictional test details only. No delivery is available.</p>
      <div className="field-pair">
        <label>
          Address label
          <input
            name="label"
            required
            maxLength={30}
            value={fields.label}
            onChange={(event) => setField('label', event.target.value)}
            disabled={action.disabled}
            placeholder="Example home"
          />
        </label>
        <label>
          Example recipient
          <input
            name="recipient"
            required
            maxLength={60}
            value={fields.recipient}
            onChange={(event) => setField('recipient', event.target.value)}
            disabled={action.disabled}
            placeholder="Sample Customer"
            autoComplete="off"
          />
        </label>
      </div>
      <label>
        Example street address
        <input
          name="line"
          required
          maxLength={120}
          value={fields.line}
          onChange={(event) => setField('line', event.target.value)}
          disabled={action.disabled}
          placeholder="123 Sample Lane"
          autoComplete="off"
        />
      </label>
      <div className="field-pair">
        <label>
          City
          <input
            name="city"
            required
            maxLength={60}
            value={fields.city}
            onChange={(event) => setField('city', event.target.value)}
            disabled={action.disabled}
            placeholder="Jhansi"
            autoComplete="off"
          />
        </label>
        <label>
          State
          <input
            name="region"
            required
            maxLength={60}
            value={fields.region}
            onChange={(event) => setField('region', event.target.value)}
            disabled={action.disabled}
            placeholder="Uttar Pradesh"
            autoComplete="off"
          />
        </label>
      </div>
      <label>
        Example PIN code
        <input
          name="pincode"
          required
          pattern="[1-9][0-9]{5}"
          maxLength={6}
          inputMode="numeric"
          value={fields.pincode}
          onChange={(event) => setField('pincode', event.target.value)}
          disabled={action.disabled}
          placeholder="284001"
          autoComplete="off"
        />
      </label>
      <label className="check-label">
        <input
          name="isDefault"
          type="checkbox"
          checked={Boolean(fields.isDefault)}
          onChange={(event) => setField('isDefault', event.target.checked)}
          disabled={action.disabled}
        />
        Make this my default demo address
      </label>
      <div className="button-row">
        <button type="submit" className="button primary" disabled={action.disabled}>
          Save demo address
        </button>
        {address ? (
          <button
            type="button"
            className="button secondary"
            disabled={action.disabled}
            onClick={onCancel}
          >
            Cancel edit
          </button>
        ) : (
          <button
            type="button"
            className="button secondary"
            disabled={action.disabled}
            onClick={() => setFields({ ...sampleAddress })}
          >
            Use sample details
          </button>
        )}
      </div>
      <p className="form-feedback error-message" role="status">
        {action.feedback}
      </p>
    </form>
  );
}

function Addresses({ state }: { state: AccountState }) {
  const action = useAccountAction();
  const [editId, setEditId] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const editing = state.addresses.find((address) => address.id === editId);

  function resetForm() {
    setEditId(null);
    setFormVersion((value) => value + 1);
  }

  async function remove(address: Address) {
    if (await action.run({ type: 'addressRemove', id: address.id }, 'Demo address removed')) {
      if (editId === address.id) resetForm();
    }
  }

  return (
    <>
      <div className="section-heading">
        <h2>Demo addresses</h2>
        <span className="status-pill">TEST DATA ONLY</span>
      </div>
      <p className="muted">
        Try delivery selection with saved example addresses. Removing one here does not erase the
        address snapshot in an existing demo order.{' '}
        <a className="underlined-link" href="#/info/privacy">
          How saved data works
        </a>
      </p>
      <div className="address-grid">
        {state.addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            disabled={action.disabled}
            onEdit={() => setEditId(address.id)}
            onDefault={() =>
              void action.run(
                { type: 'addressDefault', id: address.id },
                'Default demo address updated',
              )
            }
            onRemove={() => void remove(address)}
          />
        ))}
      </div>
      <p className="form-feedback error-message" role="status">
        {action.feedback}
      </p>
      <AddressForm
        key={`${editing?.id || 'new'}-${formVersion}`}
        address={editing}
        onSaved={resetForm}
        onCancel={resetForm}
      />
    </>
  );
}

function OrderCard({ order }: { order: DemoOrder }) {
  const href = `#/account/order/${order.id}`;
  return (
    <article className="order-card">
      <div>
        <span className="status-pill">DEMO · NO PAYMENT</span>
        <h3>
          <a href={href}>{order.id}</a>
        </h3>
        <p>
          {formatDate(order.createdAt)} ·{' '}
          {order.lines.reduce((count, line) => count + line.quantity, 0)} units
        </p>
      </div>
      <div>
        <strong>{statuses[order.status]}</strong>
        <p>Reference value {money(order.exampleMerchandiseMinor / 100)}</p>
        <a href={href} className="underlined-link">
          View demo order &amp; tracking
        </a>
      </div>
    </article>
  );
}

function Orders({ state }: { state: AccountState }) {
  return (
    <>
      <div className="section-heading">
        <h2>Demo orders</h2>
        <a className="underlined-link" href="#/cart">
          Try checkout
        </a>
      </div>
      <DemoBanner />
      <p className="small-note">
        {state.orders.length} of 40 demo order records used. These practice records are not
        purchases.
      </p>
      {state.orders.length > 0 ? (
        state.orders.map((order) => <OrderCard key={order.id} order={order} />)
      ) : (
        <div className="empty-state">
          <h3>Your order story starts here.</h3>
          <p>
            Add products to your bag and create a demo order to explore confirmation and tracking.
          </p>
          <a className="button primary" href="#/shop">
            Explore products
          </a>
        </div>
      )}
    </>
  );
}

function Profile({ state }: { state: AccountState }) {
  const { user } = useStore();
  const action = useAccountAction();
  const [nickname, setNickname] = useState(state.profile.nickname);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action.run({ type: 'profileSave', nickname }, 'Nickname saved');
  }

  return (
    <>
      <h2>Your profile</h2>
      <form
        className="account-panel form-grid"
        data-form="profile"
        onSubmit={(event) => void submit(event)}
      >
        <label>
          Display nickname
          <input
            name="nickname"
            maxLength={60}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            disabled={action.disabled}
            placeholder="How would you like to be greeted?"
          />
        </label>
        <button className="button primary" type="submit" disabled={action.disabled}>
          Save nickname
        </button>
        <p className="form-feedback error-message" role="status">
          {action.feedback}
        </p>
      </form>
      <div className="account-panel">
        <h3>Demo identity</h3>
        <p>{user?.email}</p>
        <p>
          This is a fictional identity on this browser, not a secure account. No email, password or payment details are collected. Anyone using this browser can resume this demo.
        </p>
        <a className="underlined-link" href="#/info/privacy">
          Read about saved data
        </a>
      </div>
    </>
  );
}

function Drafts({ state }: { state: AccountState }) {
  const action = useAccountAction();
  const [editId, setEditId] = useState<string | null>(null);
  const editing = state.drafts.find((draft) => draft.id === editId);

  if (editing)
    return (
      <>
        <h2>Edit enquiry draft</h2>
        <DraftForm
          key={editing.id}
          kind={editing.kind}
          draft={editing}
          onSaved={() => setEditId(null)}
        />
        <button
          type="button"
          className="underlined-link"
          disabled={action.disabled}
          onClick={() => setEditId(null)}
        >
          Back to saved drafts
        </button>
      </>
    );

  return (
    <>
      <h2>Your enquiry drafts</h2>
      <p className="muted">
        Saved only in this browser. Nothing here has been sent to a seller or support team.
      </p>
      {state.drafts.length > 0 ? (
        state.drafts.map((draft) => (
          <article key={draft.id} className="account-panel">
            <span className="status-pill">
              {draft.kind === 'business' ? 'BUSINESS' : 'SUPPORT'} DRAFT
            </span>
            <h3>{draft.subject}</h3>
            <p>{formatDate(draft.createdAt)}</p>
            <pre className="draft-preview">{draft.message}</pre>
            <div className="button-row">
              <CopyButton
                className="button secondary"
                text={`${draft.subject}\n\n${draft.message}\n\nDRAFT — NOT SUBMITTED`}
              >
                Copy draft
              </CopyButton>
              <button
                type="button"
                className="button secondary"
                disabled={action.disabled}
                onClick={() => setEditId(draft.id)}
              >
                Edit draft
              </button>
              <button
                type="button"
                className="button text-button"
                disabled={action.disabled}
                onClick={() =>
                  void action.run({ type: 'draftDelete', id: draft.id }, 'Enquiry draft deleted')
                }
              >
                Delete draft
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className="empty-state">
          <h3>No drafts yet.</h3>
          <a className="button primary" href="#/help">
            Visit the help centre
          </a>
        </div>
      )}
      <p className="form-feedback error-message" role="status">
        {action.feedback}
      </p>
    </>
  );
}

export function AccountPage({ tab = 'overview' }: { tab: string }) {
  const { state, byId, products } = useStore();
  if (!state) return null;
  let content: ReactNode;
  switch (tab) {
    case 'overview':
      content = <AccountOverview state={state} />;
      break;
    case 'orders':
      content = <Orders state={state} />;
      break;
    case 'addresses':
      content = <Addresses state={state} />;
      break;
    case 'profile':
      content = <Profile state={state} />;
      break;
    case 'drafts':
      content = <Drafts state={state} />;
      break;
    case 'recent': {
      const recent = state.recent
        .map((id) => byId.get(id))
        .filter((product): product is Product => Boolean(product));
      content = (
        <>
          <h2>Recently viewed</h2>
          <p className="muted">Your last 12 catalogue entries.</p>
          {recent.length > 0 ? (
            <ProductGrid products={recent} />
          ) : (
            <div className="empty-state">
              <h3>Your next discovery is waiting.</h3>
              <a className="button primary" href="#/shop">
                Explore the collection
              </a>
            </div>
          )}
        </>
      );
      break;
    }
    case 'wishlist': {
      const wishlist = products.filter((product) => state.wishlist.includes(product.id));
      content = (
        <>
          <h2>Your favourites</h2>
          {wishlist.length > 0 ? (
            <ProductGrid products={wishlist} />
          ) : (
            <div className="empty-state">
              <h3>A little space for what you love.</h3>
              <p>Tap the heart on any entry to save it here.</p>
              <a className="button primary" href="#/shop">
                Explore the collection
              </a>
            </div>
          )}
        </>
      );
      break;
    }
    default:
      content = (
        <div className="empty-state">
          <h2>This page isn’t in the collection.</h2>
          <a href="#/account" className="button primary">
            Back to your account
          </a>
        </div>
      );
  }
  return <AccountLayout tab={tab}>{content}</AccountLayout>;
}

function ReturnDraftForm({ order }: { order: DemoOrder }) {
  const action = useAccountAction();
  const [reason, setReason] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action.run(
      { type: 'demoReturnDraft', id: order.id, reason },
      'Demo return draft saved. Nothing submitted.',
    );
  }

  return (
    <form
      className="account-panel form-grid"
      data-form="return"
      onSubmit={(event) => void submit(event)}
    >
      <input type="hidden" name="orderId" value={order.id} />
      <h3>Try a return request</h3>
      <label>
        Example reason
        <textarea
          name="reason"
          required
          maxLength={300}
          rows={3}
          placeholder="Describe a sample issue without personal information"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={action.disabled}
        />
      </label>
      <p className="small-note">
        This saves an unsubmitted demo draft. Return policies are still to be confirmed.
      </p>
      <button className="button secondary" type="submit" disabled={action.disabled}>
        Save demo return draft
      </button>
      <p className="form-feedback error-message" role="status">
        {action.feedback}
      </p>
    </form>
  );
}

export function OrderPage({ id }: { id: string }) {
  const { state } = useStore();
  const action = useAccountAction();
  const order = state?.orders.find((item) => item.id === id);
  if (!order)
    return (
      <AccountLayout tab="orders">
        <div className="empty-state">
          <h2>Demo order not found.</h2>
          <a href="#/account/orders">Back to demo orders</a>
        </div>
      </AccountLayout>
    );
  const steps: OrderStatus[] = ['created', 'packed', 'dispatched', 'delivered'];
  const canAdvance = ['created', 'packed', 'dispatched'].includes(order.status);
  const canCancel = ['created', 'packed'].includes(order.status);
  const summary = [
    'DEMO ORDER — NOT AN INVOICE',
    order.id,
    statuses[order.status],
    ...order.lines.map((line) => `${displayName(line)} × ${line.quantity}`),
    `Reference merchandise value: ${money(order.exampleMerchandiseMinor / 100)}`,
    'No payment, real purchase or shipment.',
  ].join('\n');

  return (
    <AccountLayout tab="orders">
      <a className="underlined-link" href="#/account/orders">
        ← All demo orders
      </a>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{order.id}</p>
          <h2>{statuses[order.status]}</h2>
        </div>
        <CopyButton className="button secondary" text={summary}>
          Copy demo summary
        </CopyButton>
      </div>
      <DemoBanner />
      <p className="muted">
        Created {formatDate(order.createdAt)}. Every tracking event below is simulated. No courier
        is connected.
      </p>
      <ol className="tracking-timeline">
        {steps.map((status, index) => {
          const event = order.events.find((item) => item.status === status);
          return (
            <li key={status} className={event ? 'complete' : ''}>
              <span>{event ? '✓' : index + 1}</span>
              <div>
                <strong>{statuses[status]}</strong>
                <small>{event ? formatDate(event.at) : 'Not simulated yet'}</small>
              </div>
            </li>
          );
        })}
      </ol>
      {order.status === 'cancelled' && (
        <div className="notice-panel">
          This demo was cancelled. No payment was taken and no refund is due.
        </div>
      )}
      <div className="button-row">
        {canAdvance && (
          <button
            className="button secondary"
            type="button"
            disabled={action.disabled}
            onClick={() =>
              void action.run(
                {
                  type: 'demoOrderAdvance',
                  id: order.id,
                  expectedStatus: order.status,
                },
                'Demo tracking step simulated',
              )
            }
          >
            Simulate next tracking step
          </button>
        )}
        {canCancel && (
          <button
            className="button text-button"
            type="button"
            disabled={action.disabled}
            onClick={() =>
              void action.run(
                { type: 'demoOrderCancel', id: order.id },
                'Demo order cancelled. No payment was taken.',
              )
            }
          >
            Cancel this demo order
          </button>
        )}
      </div>
      <p className="form-feedback error-message" role="status">
        {action.feedback}
      </p>
      <div className="account-panel">
        <h3>Items in this demo</h3>
        {order.lines.map((line) => (
          <div key={line.id} className="order-line">
            <a href={`#/product/${line.id}`}>
              {displayName(line)}
              <small>
                Quantity {line.quantity} ·{' '}
                {line.priceBasis === 'current' ? 'Current selling price' : 'Historical 2022 MRP'}{' '}
                {money(line.unitMinor / 100)} each
              </small>
            </a>
            <strong>{money((line.unitMinor * line.quantity) / 100)}</strong>
          </div>
        ))}
        <div className="summary-row">
          <span>Reference merchandise subtotal</span>
          <strong>{money(order.subtotalMinor / 100)}</strong>
        </div>
        {order.discountMinor > 0 && (
          <div className="summary-row">
            <span>DEMO10 · example discount</span>
            <strong>−{money(order.discountMinor / 100)}</strong>
          </div>
        )}
        <div className="summary-row">
          <span>Example merchandise after discount</span>
          <strong>{money(order.exampleMerchandiseMinor / 100)}</strong>
        </div>
        <p className="small-note">
          Not a quote, invoice or payable total. Final availability, tax and shipping are
          unconfirmed.
        </p>
      </div>
      <div className="account-panel">
        <h3>{order.method === 'delivery' ? 'Demo delivery address' : 'Demo collection'}</h3>
        {order.address ? (
          <AddressCard address={order.address} />
        ) : (
          <p>Collection is a sample choice. No pickup location or service has been confirmed.</p>
        )}
      </div>
      {order.status === 'delivered' &&
        (order.returnDraft ? (
          <div className="account-panel">
            <span className="status-pill">RETURN DRAFT · NOT SUBMITTED</span>
            <h3>Return request draft saved</h3>
            <p>{order.returnDraft.reason}</p>
            <p className="small-note">
              No return, refund or seller notification has been initiated. Live eligibility and time
              limits are pending.
            </p>
          </div>
        ) : (
          <ReturnDraftForm key={order.id} order={order} />
        ))}
    </AccountLayout>
  );
}
