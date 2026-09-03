# 1Ecomm Ionic + Capacitor Storefront Starter

This is a ready-to-run Ionic React shop designed for mobile-sized screens. It shows products, cart, guest checkout choices and a pending non-hosted order confirmation. It never charges a card or wallet.

It fails closed when bootstrap or catalog APIs are unavailable; it never substitutes bundled products. Playwright provides request-scoped fixtures only inside tests.

## Run the web version

1. Install Node.js 20 or newer.
2. Open `public/headless-config.json` and replace only `storeId` with your provisioned 1Ecomm store ID. The included ID is a safe test fixture.

The required CI mobile-browser gate allocates its own expiring fixture, drives the real deployed catalog/cart/checkout/order/lookup APIs through this UI, and always revokes the temporary key. Local merchant setup remains store-ID-only.
3. Run:

```bash
npm ci
npm run check
npm run dev
```

4. Open the local address printed by Vite. No source-code, API URL, or key change is required.

`npm run check` builds and launches the app for a Pixel 7-profile browser test. `npm run test:e2e:live` creates an isolated fixture cart and pending bank-transfer test order against the deployed API. It does not move money.

The browser build is qualified. Native secure token storage, deep links, Android/iOS packaging, signing, device installation and store submission are still separate release gates. Never add a secret API key to the app bundle.
