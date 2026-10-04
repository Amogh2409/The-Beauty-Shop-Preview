import { memo, useRef, useState, type ReactNode } from 'react';
import type { Product } from '@shared/types';
import { useStore } from '../context/StoreContext';
import {
  categories,
  categoryOf,
  displayName,
  hasMrp,
  referenceUnitMinor,
  priceLabel,
  verificationStatus,
  money,
} from '../lib/catalogue';
import { CameraIcon, HeartIcon, PlusIcon } from './Icons';

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
export function DemoBanner() {
  return (
    <div className="demo-banner">
      <span className="status-pill">DEMO</span>
      <p>
        Explore the shopping journey. No payment, real order, shipment or support request will be
        made.
      </p>
    </div>
  );
}
export function EmptyState({
  title,
  children,
  href = '#/shop',
  label = 'Explore the collection',
}: {
  title: string;
  children?: ReactNode;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      <a className="button primary" href={href}>
        {label}
      </a>
    </div>
  );
}
export function ProductPhoto({ product, detail = false }: { product: Product; detail?: boolean }) {
  const { photos } = useStore();
  const photo = photos[product.id];
  return photo ? (
    <>
      <img
        src={photo.localPath}
        alt={`${displayName(product)} · reference product image`}
        decoding="async"
        loading={detail ? 'eager' : 'lazy'}
        width="400"
        height="400"
      />
      <span className="reference-image-label">Reference image</span>
    </>
  ) : (
    <span className="photo-pending">
      <CameraIcon />
      <span className="photo-label">Product photo pending</span>
    </span>
  );
}
export function ReferencePrice({ product }: { product: Product }) {
  const amount = referenceUnitMinor(product);
  return (
    <div className="price-block">
      <span className="price-label">{priceLabel(product)}</span>
      <span className={`reference-price ${amount === null ? 'price-pending' : ''}`}>
        {amount === null ? 'Price pending' : money(amount / 100)}
      </span>
      {product.currentOffer?.mrpMinor != null && (
        <span className="price-label">
          Current MRP {money(product.currentOffer.mrpMinor / 100)}
        </span>
      )}
      {product.currentOffer && <InventoryStatus product={product} compact />}
    </div>
  );
}
export function InventoryStatus({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const status = verificationStatus(product);
  if (!product.currentOffer || !status) return null;
  const quantity = product.currentOffer.availableQuantity;
  return (
    <div className={`inventory-status ${status.stale ? 'inventory-stale' : ''}`}>
      <span>
        {quantity === null ? 'Available quantity unknown' : `${quantity} units last recorded`}
      </span>
      <span>Stock snapshot {status.date}</span>
      <span>Price verified {status.priceDate}</span>
      {status.stale && (
        <span>
          {status.stockDateKnown
            ? 'Stock snapshot is more than 7 days old. Recheck availability.'
            : 'Stock snapshot date is unknown. Recheck availability.'}
        </span>
      )}
      {!compact && (
        <span>Imported stock snapshot only. No stock is reserved and ordering remains closed.</span>
      )}
    </div>
  );
}
export function WishButton({ product, className = '' }: { product: Product; className?: string }) {
  const { wishlist, toggleWish, busy } = useStore();
  const wished = wishlist.has(product.id);
  return (
    <button
      type="button"
      className={`wish-button ${wished ? 'is-wished' : ''} ${className}`}
      data-wish={product.id}
      disabled={busy}
      aria-label={`${wished ? 'Remove from' : 'Add to'} wishlist: ${displayName(product)}`}
      aria-pressed={wished}
      onClick={() => void toggleWish(product.id)}
    >
      <HeartIcon />
    </button>
  );
}
export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { duplicateNames, addCart, busy } = useStore();
  return (
    <article className="product-card" data-category={categoryOf(product)}>
      <div className="media-wrap">
        <a
          className="product-media"
          href={`#/product/${product.id}`}
          aria-label={`View ${displayName(product)}`}
        >
          <span className="media-category">
            {categories.find((category) => category.key === categoryOf(product))?.label}
          </span>
          <ProductPhoto product={product} />
        </a>
        <WishButton product={product} />
      </div>
      <div className="product-content">
        <p className="brand-line">
          {product.brand}
          <span className="size-label">{product.size ? `Source text: ${product.size}` : ''}</span>
        </p>
        <a className="product-title" href={`#/product/${product.id}`}>
          {displayName(product)}
        </a>
        <ReferencePrice product={product} />
        {duplicateNames.has(product.name) && (
          <p className="source-identity">
            Source code: {product.ean}
            <br />
            {product.sourceKind === 'current' ? 'Imported row' : 'Sheet row'} {product.sourceRow} ·
            separate entry
          </p>
        )}
        <button
          className="add-button"
          data-add={product.id}
          aria-label={`Add ${displayName(product)} to preview bag`}
          disabled={busy}
          onClick={() => void addCart(product.id)}
        >
          <PlusIcon /> Add to preview bag
        </button>
      </div>
    </article>
  );
});
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
export function CopyButton({
  text,
  children = 'Copy draft',
  className = 'button secondary',
}: {
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  const { notify } = useStore();
  const [fallback, setFallback] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      notify('Copied. Nothing has been sent.');
    } catch {
      setFallback(true);
      requestAnimationFrame(() => {
        field.current?.focus();
        field.current?.select();
      });
      notify('Select and copy the text.');
    }
  }
  return (
    <>
      <button type="button" className={className} onClick={() => void copy()}>
        {children}
      </button>
      {fallback && (
        <textarea
          ref={field}
          className="copy-fallback"
          rows={8}
          readOnly
          value={text}
          aria-label="Select and copy this draft"
        />
      )}
    </>
  );
}
