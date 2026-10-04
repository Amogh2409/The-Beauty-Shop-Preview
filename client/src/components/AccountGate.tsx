import { Fragment, useState, type ReactNode } from 'react';
import { useStore } from '../context/StoreContext';
import { errorMessage } from '../lib/api';
import { PageHeading } from './Common';

export function AccountGate({ children }: { children: ReactNode }) {
  const { user, state, accountLoading, accountError, reloadAccount, authenticate } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  async function enter() {
    setSubmitting(true);
    try { await authenticate(); } catch (error) { setFeedback(errorMessage(error)); }
    finally { setSubmitting(false); }
  }
  if (user && state) return <Fragment key={user.id}>{children}</Fragment>;
  if (accountLoading) return <section className="signin-card" role="status"><h1>Opening your browser demo…</h1></section>;
  return <>
    <PageHeading eyebrow="YOUR BROWSER DEMO" title="Your account." />
    <section className="signin-card">
      <span className="account-monogram">jb.</span>
      <h2>A home for your favourites.</h2>
      <p>Explore with a fictional demo identity. Your bag, wishlist and practice orders stay on this browser.</p>
      <div className="button-row">
        <button className="button primary" disabled={submitting} onClick={() => void enter()}>{submitting ? 'Opening…' : 'Enter demo account'}</button>
        {(accountError || feedback) && <button className="button secondary" onClick={() => void reloadAccount()}>Reload saved data</button>}
      </div>
      <p className="form-feedback error-message" role="status">{feedback || accountError}</p>
      <p className="small-note">No email or password is needed. This is not a secure login. Anyone using this browser can resume the same demo; use fictional details only. Clearing site data resets the demo.</p>
      <a href="#/info/privacy" className="underlined-link">Privacy &amp; saved data</a>
    </section>
  </>;
}
