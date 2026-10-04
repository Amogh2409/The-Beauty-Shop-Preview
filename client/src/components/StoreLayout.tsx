import type { ReactNode } from 'react';
import { useStore } from '../context/StoreContext';
import { AccountIcon, BagIcon, HeartIcon } from './Icons';

function Header() {
  const { wishlist, state } = useStore();
  const quantity = Object.values(state?.cart ?? {}).reduce((sum, value) => sum + value, 0);
  return (
    <>
      <a
        className="skip"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus();
          main?.scrollIntoView({ block: 'start' });
        }}
      >
        Skip to content
      </a>
      <div className="preview-bar">
        Browser-only demo <span aria-hidden="true">·</span> Ordering not open
      </div>
      <header className="site-header">
        <a href="#/" className="identity" aria-label="Jhansi Beauty home">
          <span className="mark">jb.</span>
          <span>
            Jhansi Beauty
            <span className="identity-sub">THE BEAUTY EDIT · PREVIEW</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#/account" className="nav-icon account-nav" aria-label="Your account">
            <AccountIcon />
            <span>Account</span>
          </a>
          <a href="#/shop" className="nav-link">
            Shop all
          </a>
          <a href="#/shop?category=Face" className="nav-link">
            Skincare
          </a>
          <a href="#/shop?category=Hair" className="nav-link">
            Haircare
          </a>
          <a
            href="#/wishlist"
            className="nav-icon"
            aria-label={`Wishlist, ${wishlist.size} entries`}
          >
            <HeartIcon />
            <span id="wishlist-count">{wishlist.size}</span>
          </a>
          <a href="#/cart" className="shortlist-trigger">
            <BagIcon />
            <span className="bag-label">Bag</span> <span id="cart-count">{quantity}</span>
          </a>
        </nav>
      </header>
      <div className="mobile-nav">
        <a href="#/shop">Shop all</a>
        <a href="#/shop?category=Face">Skincare</a>
        <a href="#/shop?category=Hair">Haircare</a>
        <a href="#/shop?category=Body">Body care</a>
        <a href="#/shop?category=Baby">Baby care</a>
      </div>
    </>
  );
}
function Footer() {
  return (
    <footer className="commerce-footer">
      <div className="footer-brand">
        <a href="#/" className="identity">
          Jhansi Beauty
        </a>
        <p>Beauty &amp; personal care, in one place.</p>
        <span>Working name · Jhansi, India</span>
      </div>
      <div>
        <h2>Explore</h2>
        <a href="#/shop">All products</a>
        <a href="#/wishlist">My wishlist</a>
        <a href="#/cart">My bag</a>
        <a href="#/account/orders">Demo orders</a>
        <a href="#/account/addresses">Saved demo addresses</a>
      </div>
      <div>
        <h2>Information</h2>
        <a href="#/info/about">About this preview</a>
        <a href="#/info/shipping">Shipping &amp; returns</a>
        <a href="#/help">Help &amp; contact</a>
        <a href="#/business">Business enquiries</a>
        <a href="#/readiness">Before live orders</a>
      </div>
      <div className="footer-disclaimer">
        <h2>A store in the making</h2>
        <p>
          Historical and imported current entries are labelled separately. Product photos and live
          ordering still need confirmation. Checkout is a preview only.
        </p>
      </div>
      <div className="footer-bottom">
        <span>Browser-only demo · Saved on this device · Ordering not open</span>
        <a href="#/info/privacy">Privacy &amp; saved data</a>
      </div>
    </footer>
  );
}
export function StoreLayout({ children }: { children: ReactNode }) {
  const {
    accountError,
    accountLoading,
    busy,
    pending,
    ready,
    user,
    reloadAccount,
    retryPending,
    dismissPending,
    toast,
  } = useStore();
  return (
    <>
      <Header />
      <div id="sync-notice" role="status" aria-live="polite" hidden={!accountError}>
        <span>{accountError}</span>
        <button disabled={busy || accountLoading} onClick={() => void reloadAccount()}>
          Reload saved data
        </button>
        {pending && ready && (
          <>
            <button disabled={busy} onClick={() => void retryPending()}>
              Retry pending change
            </button>
            <button disabled={busy} onClick={dismissPending}>
              Keep saved version
            </button>
          </>
        )}
        {!user && <a href="#/account">Sign in</a>}
      </div>
      <main id="main-content" tabIndex={-1} aria-busy={busy}>
        {children}
      </main>
      <Footer />
      <div
        id="toast"
        className={`toast ${toast ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </>
  );
}
