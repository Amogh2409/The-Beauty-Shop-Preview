# The Beauty Shop Preview

A public, browser-only demonstration of Jhansi Beauty. The original React components, plum-and-cream styling and artwork are reused. This repository contains customer-facing code only; the separate MERN application remains private.

## Try it

https://Amogh2409.github.io/The-Beauty-Shop-Preview/

Browse 277 historical reference products; search, filter and sort; open **Account → Enter demo account**; save a wishlist and bag; try sample delivery or collection, `DEMO10`, demo order tracking and unsubmitted drafts.

The demo identity is fictional, not authentication. No email, password or payment details are requested. Selections and practice records persist only in this browser's local storage. Anyone using the same browser can resume them. Use fictional example details; clear site data to reset. Nothing is sent to a seller, payment provider or courier. GitHub may log IP addresses for hosting security.

Historical 2022 prices and product placeholders are preserved. They are not current prices, verified stock, or offers for sale. Real ordering, supplier administration, email and payments are unavailable. No supplier workbook, cost data, credentials, backend, database, or pre-existing user/order data is included.

## Develop

Node 22.13+:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Vite uses `/The-Beauty-Shop-Preview/` as the base. Hash routes support direct links, back/forward and reloads on GitHub Pages. `npm run build` includes TypeScript and a public-output leakage check. The test suite covers shared domain behavior and local storage, persistence, idempotency, validation and storage errors. No runtime API calls are made.

The Pages workflow builds and tests `main`, then deploys only `dist`. The site includes `noindex,nofollow`; this discourages search indexing and is **not access control**. The site and this repository are public.

Artwork and brand-reference limitations: see THIRD_PARTY_NOTICES.md.
