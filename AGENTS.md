# AI engineering guide

Read `README.md`, `docs/mobile-boundary.md`, `capacitor.config.ts`, `src/main.tsx`, and both Playwright suites before editing.

## Boundary and contract

This Ionic React 9 + Capacitor 8 project demonstrates web/mobile-shaped headless commerce. `public/headless-config.json` contains one `storeId`. The canonical API is `phessage/ecommerce-service/contracts/headless-commerce-v1.openapi.yaml`. Preserve server authority, key-derived tenancy, cart bearer-token secrecy, stable order idempotency and neutral order lookup. Use `items.length`; never invent `itemCount`.

The browser journey is not native qualification. Do not claim Android/iOS readiness until secure storage, PKCE/deep links, network policy, packaging/signing, installed-device behavior and store submission are proven.

## Ionic/Capacitor/React practices

- Use Ionic components for navigation, input, safe areas, focus and platform behavior; do not recreate them with generic divs.
- Keep React state and effects explicit, cancellable and free of duplicated server calculations.
- Use Capacitor plugins only behind a typed adapter with web fallback and permission/error handling.
- A production cart token belongs in Keychain/Keystore through a vetted secure-storage implementation, never ordinary local/session storage.
- Test touch targets, keyboard avoidance, back navigation, offline/online transitions and screen readers.
- Vite 8 requires Node 20.19+ or a supported newer line. Keep Capacitor packages on one compatible major and update native projects deliberately.

## Verification

Run `rm -rf node_modules && npm ci`, `npm run check`, and the sandbox live web journey. Native changes also require Android/iOS sync/build and installed-device evidence. Missing native tooling is an explicit unverified boundary, not a green result.
