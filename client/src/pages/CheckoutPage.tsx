import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from '../context/StoreContext';
import { DemoBanner, PageHeading } from '../components/Common';
import {
  bagTotals,
  cartLines,
  unavailableCartLines,
  displayName,
  hasReferencePrice,
  referenceUnitMinor,
  priceLabel,
  money,
} from '../lib/catalogue';
import { AddressCard, sampleAddress } from './AccountPages';

interface CheckoutDraft {
  requestKey: string;
  step: 1 | 2;
  method: 'delivery' | 'pickup';
  addressId: string;
  coupon: string;
}

// Keep a checkout identity through visits to the address book or bag. It is scoped
// to the signed-in customer and is discarded only after a confirmed order save.
const checkoutDrafts = new Map<string, CheckoutDraft>();

function initialDraft(userId: string, completedRequestKeys: string[]): CheckoutDraft {
  const existing = checkoutDrafts.get(userId);
  if (existing && !completedRequestKeys.includes(existing.requestKey)) return existing;
  const draft: CheckoutDraft = {
    requestKey: crypto.randomUUID(),
    step: 1,
    method: 'delivery',
    addressId: '',
    coupon: '',
  };
  checkoutDrafts.set(userId, draft);
  return draft;
}

export default function CheckoutPage() {
  const { state, user, byId, busy, ready, pending, mutate, notify } = useStore();
  const userId = user?.id || '';
  const [draft, setDraft] = useState(() =>
    initialDraft(userId, state?.orders.map((order) => order.requestKey) || []),
  );
  const [couponInput, setCouponInput] = useState(draft.coupon);
  const [couponFeedback, setCouponFeedback] = useState('');
  const [feedback, setFeedback] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const locked = useRef(false);
  const disabled = busy || submitting || !ready || Boolean(pending);
  const lines = cartLines(state, byId);
  const unavailable = unavailableCartLines(state, byId);
  const totals = bagTotals(lines);
  const selectedAddress =
    state?.addresses.find((address) => address.id === draft.addressId) ||
    state?.addresses.find((address) => address.isDefault) ||
    state?.addresses[0];
  const addressId = selectedAddress?.id || '';
  const step = draft.step === 2 && draft.method === 'delivery' && !addressId ? 1 : draft.step;
  const discount =
    draft.coupon === 'DEMO10' ? Math.round(Math.round(totals.subtotal * 100) * 0.1) / 100 : 0;

  function updateDraft(change: Partial<CheckoutDraft>) {
    setDraft((current) => {
      const next = { ...current, ...change };
      checkoutDrafts.set(userId, next);
      return next;
    });
  }

  useEffect(() => {
    if (draft.step !== step) {
      setDraft((current) => {
        const next = { ...current, step };
        checkoutDrafts.set(userId, next);
        return next;
      });
    }
  }, [draft.step, step, userId]);

  function continueToReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    if (draft.method === 'delivery' && !selectedAddress) {
      setFeedback('Choose a saved demo address, or add a sample address.');
      return;
    }
    setFeedback('');
    updateDraft({ step: 2, addressId });
  }

  function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const coupon = couponInput.trim().toUpperCase();
    if (coupon && coupon !== 'DEMO10') {
      setCouponFeedback(
        'Try the example code DEMO10, or leave this blank. No real coupons are active.',
      );
      return;
    }
    setCouponInput(coupon);
    setCouponFeedback('');
    updateDraft({ coupon });
    notify(coupon ? 'Example 10% discount applied' : 'Example discount removed');
  }

  async function addSampleAddress() {
    if (locked.current || disabled) return;
    locked.current = true;
    setSubmitting(true);
    setFeedback('');
    try {
      const result = await mutate({
        type: 'addressSave',
        address: sampleAddress,
      });
      if (result) notify('Sample demo address saved');
      else
        setFeedback('The sample address was not saved. Review the account message and try again.');
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'The sample address was not saved. Please try again.',
      );
    } finally {
      locked.current = false;
      setSubmitting(false);
    }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || disabled || totals.missing > 0 || unavailable.length > 0) return;
    if (!acknowledged) {
      setFeedback('Confirm that you understand this creates only a demo order.');
      return;
    }
    if (draft.method === 'delivery' && !selectedAddress) {
      setFeedback('Choose a saved demo address before continuing.');
      updateDraft({ step: 1 });
      return;
    }
    locked.current = true;
    setSubmitting(true);
    setFeedback('');
    try {
      const result = await mutate({
        type: 'demoOrderCreate',
        requestKey: draft.requestKey,
        method: draft.method,
        ...(draft.method === 'delivery' ? { addressId } : {}),
        coupon: draft.coupon,
        acknowledged,
      });
      if (result?.orderId) {
        checkoutDrafts.delete(userId);
        notify('Demo order created. No payment or purchase was made.');
        if (window.location.hash.split('?')[0] === '#/checkout') {
          window.location.hash = `/account/order/${result.orderId}`;
        }
      } else {
        setFeedback(
          'The demo order was not confirmed. Review the account message before trying again.',
        );
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'The demo order was not confirmed. Please try again.',
      );
    } finally {
      locked.current = false;
      setSubmitting(false);
    }
  }

  if (!state || !user) return null;
  if (unavailable.length > 0)
    return (
      <>
        <PageHeading eyebrow="DEMO CHECKOUT" title="Your saved bag needs attention." />
        <div className="notice-panel">
          <h2>Remove unavailable entries first</h2>
          <p>
            {unavailable.length} saved {unavailable.length === 1 ? 'entry is' : 'entries are'} no
            longer in the visible catalogue. Demo checkout is blocked so no saved items are silently
            left out.
          </p>
          <ul>
            {unavailable.map((line) => (
              <li key={line.id}>
                Entry ID: {line.id} · Saved quantity: {line.quantity}
              </li>
            ))}
          </ul>
          <a className="button primary" href="#/cart">
            Review and remove unavailable entries
          </a>
        </div>
      </>
    );
  if (lines.length === 0)
    return (
      <>
        <PageHeading eyebrow="DEMO CHECKOUT" title="Your bag is waiting." />
        <div className="empty-state">
          <p>Add a product before trying the checkout journey.</p>
          <div className="button-row empty-actions">
            <a className="button primary" href="#/shop">
              Browse products
            </a>
            <a className="button secondary" href="#/account/orders">
              View demo orders
            </a>
          </div>
        </div>
      </>
    );
  if (state.orders.length >= 40)
    return (
      <>
        <PageHeading eyebrow="DEMO CHECKOUT" title="Your demo history is full." />
        <div className="notice-panel">
          <p>
            This browser-only preview holds up to 40 demo orders. Your saved records are preserved.
            Continue exploring tracking, cancellation or return drafts using an existing demo order.
          </p>
          <div className="button-row">
            <a className="button primary" href="#/account/orders">
              Explore existing demo orders
            </a>
            <a className="button secondary" href="#/cart">
              Back to your bag
            </a>
          </div>
        </div>
      </>
    );

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="#/cart">Your bag</a>
        <span>/</span>
        <span>Demo checkout</span>
      </nav>
      <PageHeading eyebrow="TRY THE FULL JOURNEY" title="A little closer.">
        Practice checkout with example details. Live ordering remains closed.
      </PageHeading>
      <ol className="checkout-progress">
        {['Delivery', 'Review', 'Demo confirmation'].map((label, index) => (
          <li
            key={label}
            className={step === index + 1 ? 'active' : ''}
            aria-current={step === index + 1 ? 'step' : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <DemoBanner />
      <section className="checkout-layout">
        <div>
          {step === 1 ? (
            <form data-form="checkout-delivery" className="form-grid" onSubmit={continueToReview}>
              <h2 id="delivery-method-heading">Choose a demo delivery method</h2>
              <div className="method-grid" role="group" aria-labelledby="delivery-method-heading">
                <label className="method-card">
                  <input
                    type="radio"
                    name="method"
                    value="delivery"
                    checked={draft.method === 'delivery'}
                    disabled={disabled}
                    onChange={() => updateDraft({ method: 'delivery' })}
                  />
                  <strong>Standard delivery</strong>
                  <span>Sample option · areas, fees and timing pending</span>
                </label>
                <label className="method-card">
                  <input
                    type="radio"
                    name="method"
                    value="pickup"
                    checked={draft.method === 'pickup'}
                    disabled={disabled}
                    onChange={() => updateDraft({ method: 'pickup' })}
                  />
                  <strong>Store collection</strong>
                  <span>Sample option · pickup location and availability pending</span>
                </label>
              </div>
              <h3 id="demo-address-heading">Choose a saved demo address</h3>
              <p className="small-note">
                An address is required for the delivery example only. Use fictional details.
              </p>
              <div className="address-grid" role="group" aria-labelledby="demo-address-heading">
                {state.addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    selectable
                    selected={address.id === addressId}
                    disabled={disabled}
                    onSelect={() => updateDraft({ addressId: address.id })}
                  />
                ))}
              </div>
              <div className="button-row">
                <a href="#/account/addresses" className="button secondary">
                  Add or edit demo addresses
                </a>
                {state.addresses.length === 0 && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={disabled}
                    onClick={() => void addSampleAddress()}
                  >
                    Add sample address
                  </button>
                )}
              </div>
              <button type="submit" className="button primary" disabled={disabled}>
                Continue to review
              </button>
              <p className="form-feedback error-message" role="status">
                {feedback}
              </p>
            </form>
          ) : (
            <>
              <div className="account-panel">
                <div className="section-heading">
                  <h2>Review your demo</h2>
                  <button
                    type="button"
                    className="underlined-link"
                    disabled={disabled}
                    onClick={() => {
                      updateDraft({ step: 1 });
                      setFeedback('');
                    }}
                  >
                    Edit delivery
                  </button>
                </div>
                <p>
                  <strong>
                    {draft.method === 'delivery'
                      ? 'Sample standard delivery'
                      : 'Sample store collection'}
                  </strong>
                </p>
                <p>
                  {draft.method === 'delivery' && selectedAddress
                    ? `${selectedAddress.recipient}, ${selectedAddress.line}, ${selectedAddress.city} ${selectedAddress.pincode}`
                    : 'No real pickup location has been confirmed.'}
                </p>
                <div className="review-items">
                  {lines.map(({ product, quantity }) => (
                    <div key={product.id} className="order-line">
                      <span>
                        {displayName(product)}
                        <small>
                          Quantity {quantity} · {priceLabel(product)}
                        </small>
                      </span>
                      <strong>
                        {hasReferencePrice(product)
                          ? money(((referenceUnitMinor(product) ?? 0) * quantity) / 100)
                          : 'Price pending'}
                      </strong>
                    </div>
                  ))}
                </div>
                <a className="underlined-link" href="#/cart">
                  Edit your bag
                </a>
              </div>
              <form data-form="coupon" className="coupon-form" onSubmit={applyCoupon}>
                <label>
                  Try an example coupon
                  <input
                    name="coupon"
                    maxLength={20}
                    value={couponInput}
                    disabled={disabled}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="DEMO10"
                  />
                </label>
                <button type="submit" className="button secondary" disabled={disabled}>
                  Apply
                </button>
                <p className="small-note">
                  DEMO10 demonstrates 10% off reference merchandise values. It is not a real
                  promotion.
                </p>
                <p className="form-feedback error-message" role="status">
                  {couponFeedback}
                </p>
              </form>
              <div className="notice-panel">
                <h3>Payments are not connected</h3>
                <p>
                  No card, UPI, bank or payment details are collected. Tax and shipping cannot be
                  calculated until store details are confirmed.
                </p>
              </div>
              <form
                data-form="create-order"
                className="form-grid"
                onSubmit={(event) => void createOrder(event)}
              >
                <label className="check-label">
                  <input
                    name="acknowledged"
                    type="checkbox"
                    required
                    checked={acknowledged}
                    disabled={disabled}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  I understand this creates only a DEMO order. No payment, shipment or purchase is
                  made.
                </label>
                {totals.missing > 0 && (
                  <div className="error-message">
                    <p>These entries have no usable reference price:</p>
                    <ul>
                      {lines
                        .filter(({ product }) => !hasReferencePrice(product))
                        .map(({ product }) => (
                          <li key={product.id}>
                            <a className="underlined-link" href={`#/product/${product.id}`}>
                              {displayName(product)}
                            </a>
                          </li>
                        ))}
                    </ul>
                    <a className="underlined-link" href="#/cart">
                      Return to your bag to edit the selection
                    </a>
                  </div>
                )}
                <button
                  type="submit"
                  className="button primary"
                  disabled={disabled || totals.missing > 0}
                >
                  {submitting ? 'Creating demo order…' : 'Create demo order'}
                </button>
                <p className="form-feedback error-message" role="status">
                  {feedback}
                </p>
              </form>
            </>
          )}
        </div>
        <aside className="order-summary">
          <p className="eyebrow">DEMO REFERENCE SUMMARY</p>
          <h2>Your selection</h2>
          <div className="summary-row">
            <span>Units</span>
            <strong>{totals.units}</strong>
          </div>
          <div className="summary-row">
            <span>Reference value subtotal</span>
            <strong>{money(totals.subtotal)}</strong>
          </div>
          {totals.missing > 0 && (
            <p className="missing-price">
              {totals.missing} price-pending units are excluded. This subtotal is incomplete.
            </p>
          )}
          {discount > 0 && (
            <div className="summary-row">
              <span>Example DEMO10 discount</span>
              <strong>−{money(discount)}</strong>
            </div>
          )}
          <div className="summary-row">
            <span>Tax &amp; shipping</span>
            <span>Unconfirmed</span>
          </div>
          <div className="summary-total">
            <span>Current payable total</span>
            <strong>Unavailable</strong>
          </div>
          <p className="summary-note">
            Historical and current values are labelled separately. No amount will be charged.
          </p>
          <a className="continue-shopping" href="#/cart">
            Back to bag
          </a>
        </aside>
      </section>
    </>
  );
}
