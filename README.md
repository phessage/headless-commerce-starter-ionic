# 1Ecomm Ionic + Capacitor Storefront Starter

Hybrid web/iOS/Android reference storefront using Ionic React and the headless catalog, anonymous-cart and checkout-preparation preview. Run `npm install && npm run check`.

The default catalog is synthetic and contains no production data. Set `VITE_HEADLESS_API_URL` and `VITE_HEADLESS_PUBLISHABLE_KEY` for a dedicated sandbox. Only a publishable key may be bundled; never embed administrative secrets.

`npm run test:e2e:live` fails closed without those variables and runs the real fixture journey in a Pixel 7 browser profile. Native packaging, secure cart-token storage, deep links, signing and store submission remain separate release gates. Never clone production customer data into a demo environment.
