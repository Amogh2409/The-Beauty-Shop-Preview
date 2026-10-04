import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { DraftKind, EnquiryDraft } from '@shared/types';
import { useStore } from '../context/StoreContext';
import { cartLines, enquiryText } from '../lib/catalogue';
import { CopyButton } from './Common';

export function DraftForm({
  kind,
  draft,
  onSaved,
}: {
  kind: DraftKind;
  draft?: EnquiryDraft;
  onSaved?: () => void;
}) {
  const { state, byId, user, mutate, busy, notify } = useStore();
  const generated = kind === 'business' ? enquiryText(cartLines(state, byId)) : '';
  const [subject, setSubject] = useState(draft?.subject ?? '');
  const [message, setMessage] = useState(draft?.message ?? generated);
  const dirty = useRef(Boolean(draft));
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (!dirty.current) setMessage(generated);
  }, [generated]);
  const full = !draft && (state?.drafts.length ?? 0) >= 30;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || busy) return;
    setSubmitting(true);
    setFeedback('');
    const result = await mutate(
      draft
        ? { type: 'draftUpdate', id: draft.id, subject, message }
        : { type: 'draftSave', kind, subject, message },
    );
    setSubmitting(false);
    if (result) {
      notify('Private draft saved. Nothing submitted.');
      if (onSaved) onSaved();
      else window.location.hash = '/account/drafts';
    } else setFeedback('This draft was not saved. Review the message above before retrying.');
  }
  return (
    <form className="account-panel form-grid" onSubmit={(event) => void save(event)}>
      <label>
        {kind === 'business' ? 'Enquiry subject' : 'Topic'}
        <input
          name="subject"
          required
          maxLength={120}
          value={subject}
          disabled={submitting}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={
            kind === 'business'
              ? 'Product availability and bulk pricing'
              : 'Question about the store preview'
          }
        />
      </label>
      <label>
        Your draft
        <textarea
          name="message"
          required
          maxLength={50000}
          rows={7}
          value={message}
          disabled={submitting}
          onChange={(event) => {
            dirty.current = true;
            setMessage(event.target.value);
          }}
          placeholder="Describe what you would like confirmed. Avoid sensitive personal information."
        />
        <span className="draft-length small-note" role="status">
          {message.length.toLocaleString()} / 50,000 characters · Nothing is sent automatically.
        </span>
      </label>
      <p className="small-note">
        Saved only in this browser; not sent to a seller. No response will follow until you copy it to a
        verified contact.
      </p>
      {full && (
        <p className="error-message">
          Your 30 draft slots are full. <a href="#/account/drafts">Edit an existing saved draft</a>{' '}
          to continue.
        </p>
      )}
      <p className="small-note">
        {kind === 'business'
          ? 'The draft uses your bag’s product names and quantities. It does not disclose wholesale costs. No minimum order or bulk price is assumed.'
          : 'Use example details for demo orders. Do not include payment information.'}
      </p>
      {!user && (
        <p className="small-note">
          <a className="underlined-link" href="#/account">
            Sign in to save drafts
          </a>
          . Copy any text you want to keep before signing in.
        </p>
      )}
      <div className="button-row">
        <button
          type="submit"
          className="button primary"
          disabled={!user || full || busy || submitting}
        >
          {submitting
            ? 'Saving…'
            : `${draft ? 'Update' : 'Save local'} ${kind === 'business' ? 'business' : 'support'} draft`}
        </button>
        <CopyButton text={`${subject}\n\n${message}\n\nDRAFT — NOT SUBMITTED`} />
      </div>
      <p className="form-feedback error-message" role="status">
        {feedback}
      </p>
    </form>
  );
}
