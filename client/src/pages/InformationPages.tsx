import { useStore } from '../context/StoreContext';
import { hasMrp } from '../lib/catalogue';
import { PageHeading } from '../components/Common';
import { DraftForm } from '../components/DraftForm';

const questions = [
  [
    'Can I buy these products?',
    'Not yet. Current prices, stock, seller details and payments must be confirmed before ordering opens. You can try a clearly marked demo order.',
  ],
  [
    'Are these prices current?',
    'No. Listed MRPs come from the historical 2022 source sheet. Price-pending products have no usable reference price and cannot be included in demo checkout.',
  ],
  [
    'How does my account work?',
    'A fictional demo identity opens the account screens. All selections and practice records stay in this browser; no email or password is requested.',
  ],
  [
    'Does tracking show a real courier?',
    'No. Tracking steps change only when you choose to simulate the next step. There is no courier connection or delivery estimate.',
  ],
  [
    'Can I cancel or return an order?',
    'You can cancel a created or packed demo order, and save an unsubmitted return draft after simulated delivery. These sample rules are not the store’s live policy.',
  ],
  [
    'How do I contact the store?',
    'Verified business contact details are still pending. You can save or copy an enquiry draft here; nothing is sent automatically.',
  ],
];
export function HelpPage() {
  return (
    <>
      <PageHeading eyebrow="HELP CENTRE" title="Let’s make it simple.">
        Answers about your browser-only shopping preview.
      </PageHeading>
      <section className="help-layout">
        <div className="faq-list">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <aside className="account-panel">
          <span className="status-pill">CONTACT DETAILS PENDING</span>
          <h2>Need a hand?</h2>
          <p>Official phone, email, business address and opening hours haven’t been added.</p>
          <a className="button secondary" href="#/account/orders">
            Find a demo order
          </a>
          <a className="button text-button" href="#/business">
            Buying for a business?
          </a>
          <a className="underlined-link" href="#/readiness">
            What’s needed before live orders
          </a>
        </aside>
      </section>
      <section className="narrow-section">
        <h2>Prepare a support enquiry</h2>
        <p className="muted">Save a browser-only draft to review or copy. It will not be submitted.</p>
        <DraftForm kind="support" />
      </section>
    </>
  );
}
export function BusinessPage() {
  return (
    <>
      <PageHeading eyebrow="FOR BUSINESS BUYERS" title="Start a conversation.">
        Build a product enquiry without committing to a purchase.
      </PageHeading>
      <section className="business-layout">
        <div>
          <DraftForm kind="business" />
        </div>
        <aside className="account-panel">
          <h2>What to confirm</h2>
          <ul className="plain-list">
            <li>Current product variants and availability</li>
            <li>Retail or business selling prices</li>
            <li>Minimum quantities and carton sizes</li>
            <li>Business invoicing and applicable tax</li>
            <li>Delivery coverage, charges and lead time</li>
          </ul>
          <p className="small-note">
            No trade relationship, authorised dealer status or supply agreement is claimed. Store
            contact details are pending.
          </p>
          <a href="#/cart" className="button secondary">
            Edit product selection
          </a>
          <a href="#/account/drafts" className="button text-button">
            View saved drafts
          </a>
        </aside>
      </section>
    </>
  );
}
export function ReadinessPage() {
  const { products } = useStore();
  const missing = products.filter(
    (product) => product.sourceKind !== 'current' && !hasMrp(product),
  ).length;
  const items = [
    [
      'Product and stock verification',
      `277 historical 2022 entries are preserved. Confirm each sellable variant, current price, batch, expiry, stock and label information before enabling sales. ${missing} entry has no historical MRP.`,
      'Review catalogue',
      '#/shop?price=missing',
    ],
    [
      'Seller identity and contact',
      'Confirm the business name, seller address, support phone or email, and any business or tax details that apply. No verified seller contact is currently listed.',
      'View help centre',
      '#/help',
    ],
    [
      'Delivery and store policies',
      'Confirm deliverable PIN codes, shipping charges and timelines, pickup if offered, tax and invoice rules, cancellation and return/refund terms, and who handles dispatch and customer support. Nationwide shipping is a goal, not a verified service promise.',
      'Review policy placeholders',
      '#/info/shipping',
    ],
    [
      'Merchant account and real payments',
      'Confirm the company that receives customer payments and appears on invoices. Open and verify its merchant account with a chosen gateway; complete business, bank and KYC checks directly with the provider. No payment gateway is connected.',
      'Explore the current demo',
      '#/checkout',
    ],
    [
      'Public checkout and launch testing',
      'Approve how customers will access the store and how the gateway will reach a secure payment-notification endpoint. This preview is not yet an all-India retail checkout. Test payment success, failure, duplicate notifications, stock conflicts, refunds and order reconciliation before live approval.',
      'View the preview account',
      '#/account',
    ],
    [
      'Commercial readiness',
      'Confirm selling prices, business/bulk terms and the commission arrangement before treating this as a trading store. Historical MRPs are not live offers or a margin calculation.',
      'Prepare a business enquiry',
      '#/business',
    ],
  ];
  return (
    <>
      <PageHeading eyebrow="BEFORE LIVE ORDERS" title="What still needs to be ready.">
        The shopping preview works. The business details below still need owner confirmation.
      </PageHeading>
      <div className="readiness-summary">
        <span className="status-pill">ORDERING CLOSED</span>
        <p>
          No current stock, price, seller contact or policy is assumed. Nothing on this list enables
          sales automatically.
        </p>
      </div>
      <section className="readiness-list">
        {items.map(([title, body, label, href], index) => (
          <article className="readiness-card" key={title}>
            <span className="readiness-number">0{index + 1}</span>
            <div>
              <span className="status-pill">PENDING CONFIRMATION</span>
              <h2>{title}</h2>
              <p>{body}</p>
              <a className="underlined-link" href={href}>
                {label}
              </a>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
function AboutContent() {
  return (
    <>
      <p>
        Jhansi Beauty is a working name for this cosmetics storefront preview. All 277 historical
        Mamaearth source entries remain separate, with their original names and source codes.
      </p>
      <h2>What you can explore</h2>
      <p>
        Browse the collection, save your favourites and bag, open a demo identity, save example
        addresses, and try a complete demo checkout and order journey. No real order or payment is
        made.
      </p>
      <h2>Before opening the store</h2>
      <p>
        Current prices, stock, verified variants, product photos, seller identity, business contact
        details, delivery coverage, tax treatment and final policies need confirmation. No brand
        partnership or authorised dealer status is claimed.
      </p>
    </>
  );
}
function ShippingContent() {
  return (
    <>
      <div className="info-status">Launch details pending</div>
      <h2>Shipping &amp; collection</h2>
      <p>
        Delivery areas, courier options, pickup location, fees and timeframes have not been
        confirmed. Checkout choices are examples only.
      </p>
      <h2>Returns &amp; exchanges</h2>
      <p>
        Eligibility, time limits, product conditions and refund methods must be agreed before
        ordering opens. The demo return form saves a browser-only, unsubmitted practice draft.
      </p>
      <h2>Cancellations</h2>
      <p>
        The demo allows cancellation before simulated dispatch to illustrate the workflow. This is
        not a promise about future cancellation rights or charges.
      </p>
    </>
  );
}
function PrivacyContent() {
  return <>
    <h2>A demo identity, not a real account</h2>
    <p>No email, password or payment information is collected. The fixed demo identity is fictional and is not authentication.</p>
    <h2>Saved only in this browser</h2>
    <p>Your bag, wishlist, nickname, example addresses, demo orders and unsubmitted drafts use local browser storage. They do not sync across devices. Anyone using this browser can resume the demo. Leaving the demo identity does not erase those records.</p>
    <h2>Keep example data fictional</h2>
    <p>Use sample addresses and names. Nothing is sent to a seller, payment service or courier. This public site has no supplier importer.</p>
    <h2>Remove saved data</h2>
    <p>Remove individual items with their controls, or clear this site’s browser data to reset all demo records. Clearing browser data or using a private browsing window may remove your selections. No server copy exists to recover.</p>
    <h2>Public hosting</h2>
    <p>Anyone with the link can view this public demo. GitHub Pages serves these files and may record visitor IP addresses for security. Search indexing is discouraged, but that does not make the site private.</p>
  </>;
}
export function InfoPage({ topic }: { topic: string }) {
  if (topic === 'help') return <HelpPage />;
  const title =
    topic === 'shipping'
      ? 'Shipping & returns.'
      : topic === 'privacy'
        ? 'Your account, thoughtfully saved.'
        : 'A store in the making.';
  const eyebrow =
    topic === 'shipping'
      ? 'DRAFT INFORMATION · NOT A LIVE POLICY'
      : topic === 'privacy'
        ? 'PRIVACY & SAVED DATA'
        : 'ABOUT THIS PREVIEW';
  return (
    <section className="info-page">
      <PageHeading title={title} eyebrow={eyebrow} />
      <div className="info-body">
        {topic === 'shipping' ? (
          <ShippingContent />
        ) : topic === 'privacy' ? (
          <PrivacyContent />
        ) : (
          <AboutContent />
        )}
      </div>
      <a href="#/shop" className="button secondary">
        Explore the collection
      </a>
    </section>
  );
}
