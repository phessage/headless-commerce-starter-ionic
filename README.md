# 1Ecomm Ionic + Capacitor Storefront Starter

Hybrid web/iOS/Android reference storefront using Ionic React and the headless catalog, anonymous-cart, checkout-preparation and non-hosted pending-order preview. Run `npm install && npm run check`.

Change only `storeId` in `public/headless-config.json` to run the catalog, anonymous-cart and checkout-preparation app for another configured store. The app resolves the public runtime document at startup; never embed administrative secrets.

`npm run test:e2e:live` runs the real fixture journey in a Pixel 7 browser profile. Native packaging, secure cart-token storage, deep links, signing and store submission remain separate release gates. Never clone production customer data into a demo environment.
