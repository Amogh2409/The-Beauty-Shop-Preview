import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { boundedQuantity, categories, categoryOf, displayName } from '../lib/catalogue';
import {
  ProductGrid,
  InventoryStatus,
  ProductPhoto,
  ReferencePrice,
  WishButton,
} from '../components/Common';

export default function ProductPage({ id }: { id: string }) {
  const { byId, products, photos, state, ready, pending, mutate, addCart, busy } = useStore();
  const product = byId.get(id);
  const [quantity, setQuantity] = useState(1);
  const recentId = state?.recent[0];
  useEffect(() => {
    if (product && ready && !pending && recentId !== id)
      void mutate({ type: 'recentAdd', id }, { silent: true });
  }, [id, product, ready, pending, recentId, mutate]);
  useEffect(() => setQuantity(1), [id]);
  const related = useMemo(
    () =>
      product
        ? products
            .filter(
              (candidate) => categoryOf(candidate) === categoryOf(product) && candidate.id !== id,
            )
            .slice(0, 4)
        : [],
    [id, product, products],
  );
  if (!product)
    return (
      <div className="empty-state">
        <h1>This page isn’t in the collection.</h1>
        <a href="#/shop" className="button primary">
          Explore products
        </a>
      </div>
    );
  const category = categories.find((candidate) => candidate.key === categoryOf(product))!;
  const image = photos[id];
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">Home</a>
        <span>/</span>
        <a href={`#/shop?category=${category.key}`}>{category.title}</a>
        <span>/</span>
        <span>Product details</span>
      </nav>
      <section className="product-page">
        <div className="pdp-media product-media">
          <ProductPhoto product={product} detail />
        </div>
        <div className="pdp-copy">
          <p className="eyebrow">
            {product.brand} · {category.label.toUpperCase()}
          </p>
          <h1>{displayName(product)}</h1>
          <ReferencePrice product={product} />
          <p className="pdp-status">
            {product.currentOffer
              ? 'Imported current offer · live ordering remains closed'
              : 'Current price & availability pending'}
          </p>
          {product.currentOffer && <InventoryStatus product={product} />}
          <dl className="detail-meta">
            {product.size && (
              <>
                <dt>
                  {product.sourceKind === 'current'
                    ? 'Imported size'
                    : 'Extracted size text · unverified'}
                </dt>
                <dd>{product.size}</dd>
              </>
            )}
            {product.shadeFragment && (
              <>
                <dt>
                  {product.sourceKind === 'current'
                    ? 'Imported shade / variant'
                    : 'Source variant text · unverified'}
                </dt>
                <dd>{product.shadeFragment}</dd>
              </>
            )}
            <dt>Source code</dt>
            <dd>{product.ean || 'Not supplied'}</dd>
            <dt>Entry ID</dt>
            <dd>{product.id}</dd>
            <dt>Source sheet row</dt>
            <dd>{product.sourceRow}</dd>
            {product.subcategory && (
              <>
                <dt>Source type</dt>
                <dd>{product.subcategory} · unverified classification</dd>
              </>
            )}
          </dl>
          <div className="pdp-actions">
            <label className="pdp-quantity" htmlFor="product-qty">
              Quantity
              <input
                id="product-qty"
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                value={quantity}
                onChange={(event) => setQuantity(boundedQuantity(event.target.value))}
              />
            </label>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void addCart(id, quantity)}
            >
              Add to preview bag
            </button>
            <WishButton product={product} className="pdp-wish" />
          </div>
          <div className="detail-notice">
            {product.sourceKind === 'current'
              ? 'This entry was imported and explicitly published by the store administrator. Its price and inventory are dated snapshots, not stock reservations. Live ordering remains closed.'
              : 'This is a historical 2022 reference entry. It is not an offer for sale. Pricing, availability, variants and packaging need confirmation.'}
          </div>
          <details open>
            <summary>Product information</summary>
            <p>
              {product.sourceKind === 'current'
                ? 'Product identity, size and shade follow the imported supplier sheet. Confirm packaging, ingredients, directions and batch/expiry on the physical product before purchase.'
                : 'The name and source code above are reproduced from the reference sheet. Size text is extracted from the historical name and may be incomplete for kits or combinations. Ingredients, label directions, batch/expiry and current specifications still need verification.'}
            </p>
            {image ? (
              <p>
                Image is a reference from the brand’s website. Current packaging may differ.{' '}
                {image.sourceUrl && (
                  <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Image source
                  </a>
                )}
              </p>
            ) : (
              <p>A verified product photo will be added when available.</p>
            )}
          </details>
          <details>
            <summary>Shipping &amp; returns</summary>
            <p>
              Delivery areas, fees, timeframes and return terms will be confirmed before ordering
              opens.
            </p>
          </details>
        </div>
      </section>
      <section className="related-products">
        <div className="section-heading">
          <h2>More to explore</h2>
          <a className="underlined-link" href={`#/shop?category=${category.key}`}>
            Explore {category.title.toLowerCase()}
          </a>
        </div>
        <ProductGrid products={related} />
      </section>
    </>
  );
}
