import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  bagTotals,
  boundedQuantity,
  cartLines,
  unavailableCartLines,
  displayName,
  enquiryText,
  hasReferencePrice,
  referenceUnitMinor,
  priceLabel,
  money,
  type CartLine,
} from '../lib/catalogue';
import {
  CopyButton,
  EmptyState,
  PageHeading,
  ProductGrid,
  ProductPhoto,
} from '../components/Common';

export function WishlistPage() {
  const { products, wishlist, byId, toggleWish, busy } = useStore();
  const unavailable = [...wishlist].filter((id) => !byId.has(id));
  const saved = useMemo(
    () => products.filter((product) => wishlist.has(product.id)),
    [products, wishlist],
  );
  return (
    <>
      <PageHeading eyebrow="SAVED FOR LATER" title="Your favourites.">
        {wishlist.size} saved {wishlist.size === 1 ? 'entry' : 'entries'} · Saved only in this browser
      </PageHeading>
      <section className="wishlist-page">
        {saved.length > 0 && <ProductGrid products={saved} />}
        {unavailable.length > 0 && (
          <div className="notice-panel">
            <h2>Unavailable saved entries</h2>
            <p>
              These entries are no longer in the visible catalogue. Their names and prices cannot be
              confirmed. You can remove them without changing your other favourites.
            </p>
            {unavailable.map((id) => (
              <article className="account-panel" key={id}>
                <p>
                  <strong>Unavailable saved entry</strong>
                  <br />
                  Entry ID: {id}
                </p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void toggleWish(id)}
                  aria-label={`Remove unavailable entry ${id} from wishlist`}
                >
                  Remove from wishlist
                </button>
              </article>
            ))}
          </div>
        )}
        {wishlist.size === 0 && (
          <EmptyState title="A little space for what you love.">
            Tap the heart on any entry to save it here.
          </EmptyState>
        )}
      </section>
    </>
  );
}
function QuantityControl({ line }: { line: CartLine }) {
  const { mutate, busy } = useStore();
  const { product, quantity } = line;
  const [value, setValue] = useState(String(quantity));
  useEffect(() => setValue(String(quantity)), [quantity]);
  async function commit() {
    const next = boundedQuantity(value);
    setValue(String(next));
    if (next !== quantity && !(await mutate({ type: 'cartSet', id: product.id, quantity: next })))
      setValue(String(quantity));
  }
  return (
    <div className="quantity-control">
      <button
        disabled={busy || quantity <= 1}
        onClick={() => void mutate({ type: 'cartAdjust', id: product.id, delta: -1 })}
        aria-label={`Decrease quantity for ${displayName(product)}`}
      >
        −
      </button>
      <input
        type="number"
        min="1"
        max="99"
        value={value}
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        aria-label={`Requested quantity for ${displayName(product)}`}
      />
      <button
        disabled={busy || quantity >= 99}
        onClick={() => void mutate({ type: 'cartAdjust', id: product.id, delta: 1 })}
        aria-label={`Increase quantity for ${displayName(product)}`}
      >
        +
      </button>
    </div>
  );
}
function BagSummary({ lines, unavailableUnits }: { lines: CartLine[]; unavailableUnits: number }) {
  const totals = bagTotals(lines);
  return (
    <aside className="order-summary">
      <p className="eyebrow">YOUR PREVIEW BAG</p>
      <h2>Reference summary</h2>
      <div className="summary-row">
        <span>Requested quantity</span>
        <strong>
          {totals.units + unavailableUnits}{' '}
          {totals.units + unavailableUnits === 1 ? 'unit' : 'units'}
        </strong>
      </div>
      <div className="summary-row">
        <span>Reference value subtotal</span>
        <strong>{money(totals.subtotal)}</strong>
      </div>
      {totals.missing > 0 && (
        <p className="missing-price">
          {totals.missing} {totals.missing === 1 ? 'unit has' : 'units have'} no reference price and{' '}
          {totals.missing === 1 ? 'is' : 'are'} excluded from this subtotal.
        </p>
      )}
      {unavailableUnits > 0 && (
        <p className="missing-price">
          {unavailableUnits} unavailable saved {unavailableUnits === 1 ? 'unit is' : 'units are'}{' '}
          excluded from the reference subtotal and enquiry. Remove those entries before demo
          checkout.
        </p>
      )}
      <div className="summary-row muted">
        <span>Delivery &amp; charges</span>
        <span>Pending</span>
      </div>
      <div className="summary-total">
        <span>Current payable total</span>
        <span>Not available</span>
      </div>
      <p className="summary-note">
        The subtotal uses the labelled historical or current values. It is not a quote or an amount
        you can pay.
      </p>
      <a className="button primary" href="#/checkout">
        Try demo checkout
      </a>
      <a className="button text-button" href="#/business">
        Create business enquiry
      </a>
      <CopyButton className="button text-button" text={enquiryText(lines)}>
        Copy product enquiry
      </CopyButton>
      <a className="continue-shopping" href="#/shop">
        Continue exploring
      </a>
    </aside>
  );
}
export function CartPage() {
  const { state, byId, mutate, busy, notify } = useStore();
  const lines = useMemo(() => cartLines(state, byId), [state, byId]);
  const unavailable = useMemo(() => unavailableCartLines(state, byId), [state, byId]);
  return (
    <>
      <PageHeading eyebrow="YOUR SELECTION" title="The beauty bag.">
        Your saved selection. No stock is reserved and no order is placed.
      </PageHeading>
      <section className="cart-page">
        {lines.length || unavailable.length ? (
          <div className="cart-layout">
            <div className="cart-items">
              {lines.map((line) => (
                <article className="cart-item" key={line.product.id}>
                  <a
                    href={`#/product/${line.product.id}`}
                    className="cart-item-media product-media"
                    aria-label={`View ${displayName(line.product)}`}
                  >
                    <ProductPhoto product={line.product} />
                  </a>
                  <div className="cart-item-info">
                    <p className="brand-line">{line.product.brand}</p>
                    <a href={`#/product/${line.product.id}`} className="cart-title">
                      {displayName(line.product)}
                    </a>
                    <p className="shortlist-code">
                      Source code: {line.product.ean || 'Not supplied'}
                    </p>
                    <p className="cart-price">
                      {hasReferencePrice(line.product)
                        ? money((referenceUnitMinor(line.product) ?? 0) / 100)
                        : 'Price pending'}
                      <span>
                        {hasReferencePrice(line.product)
                          ? `${priceLabel(line.product)} per unit`
                          : 'Current price pending'}
                      </span>
                    </p>
                    <div className="quantity-row">
                      <QuantityControl line={line} />
                      <button
                        className="remove-item"
                        disabled={busy}
                        aria-label={`Save ${displayName(line.product)} for later`}
                        onClick={async () => {
                          if (
                            await mutate({
                              type: 'saveLater',
                              id: line.product.id,
                            })
                          )
                            notify('Moved to your wishlist');
                        }}
                      >
                        Save for later
                      </button>
                      <button
                        className="remove-item"
                        disabled={busy}
                        aria-label={`Remove ${displayName(line.product)} from bag`}
                        onClick={() =>
                          void mutate({
                            type: 'cartSet',
                            id: line.product.id,
                            quantity: 0,
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {unavailable.map((line) => (
                <article className="cart-item" key={line.id}>
                  <div className="cart-item-media product-media">
                    <span className="photo-label">Unavailable entry</span>
                  </div>
                  <div className="cart-item-info">
                    <h2 className="cart-title">Unavailable saved entry</h2>
                    <p className="shortlist-code">Entry ID: {line.id}</p>
                    <p>
                      This entry is no longer in the visible catalogue. Its name and price cannot be
                      confirmed.
                    </p>
                    <p>Saved quantity: {line.quantity}</p>
                    <button
                      className="remove-item"
                      disabled={busy}
                      aria-label={`Remove unavailable entry ${line.id} from bag`}
                      onClick={async () => {
                        if (await mutate({ type: 'cartSet', id: line.id, quantity: 0 }))
                          notify('Unavailable entry removed from your bag.');
                      }}
                    >
                      Remove unavailable entry
                    </button>
                  </div>
                </article>
              ))}
              <p className="cart-local-note">
                Your bag is saved only in this browser. Requested quantities do not represent
                stock availability.
              </p>
            </div>
            <BagSummary
              lines={lines}
              unavailableUnits={unavailable.reduce((sum, line) => sum + line.quantity, 0)}
            />
          </div>
        ) : (
          <EmptyState title="Your next beauty find starts here.">
            Your preview bag is empty.
          </EmptyState>
        )}
      </section>
    </>
  );
}
