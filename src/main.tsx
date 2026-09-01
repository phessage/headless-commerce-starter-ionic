import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  IonApp,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  setupIonicReact,
} from "@ionic/react";
import "@ionic/react/css/core.css";
import "./style.css";
import "./checkout.css";
setupIonicReact();
type Product = {
  id: string;
  name: string;
  description: string;
  price: { amount: string; currency: string };
  available: boolean;
};
type Cart = { items: Array<{ id: string; quantity: number }> };
type Option = { id: string; name: string; capabilities?: { requiresHostedCheckout?: boolean; canPlaceOrder?: boolean } };
type Order = { orderNumber: string; status: string; paymentStatus: string; requiresPayment: false };
type Checkout = {
  shippingOptions: Option[];
  paymentMethods: Option[];
  selectedShippingMethodId: string | null;
  selectedPaymentMethodId: string | null;
  ready: boolean;
  missing: string[];
};
type Runtime = { storeId: string; apiUrl: string; publishableKey: string };
function App() {
  const [runtime, setRuntime] = useState<Runtime | null>(null),
    [items, setItems] = useState<Product[]>([]),
    [cart, setCart] = useState<Cart>({ items: [] }),
    [token, setToken] = useState(
      () => sessionStorage.getItem("headless-cart-token") ?? "",
    ),
    [checkout, setCheckout] = useState<Checkout | null>(null),
    [order, setOrder] = useState<Order | null>(null),
    [orderIntent, setOrderIntent] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const headers = (cartToken?: string, json = false) => ({
    ...(runtime ? { "x-publishable-key": runtime.publishableKey } : {}),
    ...(cartToken ? { "x-cart-token": cartToken } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  });
  useEffect(() => {
    fetch("/headless-config.json", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (config: { storeId: string; bootstrapUrl?: string }) => {
        const bootstrap = (config.bootstrapUrl ?? "https://api.1ecomm.com").replace(/\/$/, "");
        const response = await fetch(`${bootstrap}/v1/headless/stores/${encodeURIComponent(config.storeId)}/config`);
        if (!response.ok) throw new Error("Store is not configured for headless commerce");
        const value = (await response.json()).data as Runtime;
        if (value.storeId !== config.storeId || !value.publishableKey.startsWith("pk_")) throw new Error("Invalid store bootstrap response");
        setRuntime(value); return value;
      })
      .then((value) => fetch(`${value.apiUrl}/v1/headless/products`, { headers: { "x-publishable-key": value.publishableKey } }))
      .then((r) => {
        if (!r.ok) throw new Error("Catalog unavailable");
        return r.json();
      })
      .then((v) => setItems(v.data))
      .catch((e) => setError(e.message));
  }, []);
  async function ensureCart() {
    if (!runtime) throw new Error("Store configuration is not ready");
    if (token) return token;
    const response = await fetch(`${runtime.apiUrl}/v1/headless/carts`, {
      method: "POST",
      headers: headers(),
    });
    if (!response.ok) throw new Error("Cart unavailable");
    const value = await response.json();
    setToken(value.cartToken);
    sessionStorage.setItem("headless-cart-token", value.cartToken);
    return value.cartToken as string;
  }
  async function add(product: Product) {
    if (!runtime) return setError("Store configuration is not ready");
    setBusy(true);
    setError("");
    try {
      const current = await ensureCart();
      const response = await fetch(`${runtime.apiUrl}/v1/headless/carts/current/items`, {
        method: "POST",
        headers: headers(current, true),
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (!response.ok) throw new Error("Item could not be added");
      setCart((await response.json()).data);
      setStatus(`${product.name} added`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime) return setError("Store configuration is not ready");
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const address = {
        firstName: String(data.get("firstName")),
        lastName: String(data.get("lastName")),
        email: String(data.get("email")),
        address1: String(data.get("address1")),
        city: String(data.get("city")),
        state: String(data.get("state")),
        postalCode: String(data.get("postalCode")),
        country: String(data.get("country")),
      };
      const response = await fetch(
        `${runtime.apiUrl}/v1/headless/carts/current/checkout`,
        {
          method: "PATCH",
          headers: headers(token, true),
          body: JSON.stringify({
            customerInfo: {
              firstName: address.firstName,
              lastName: address.lastName,
              email: address.email,
            },
            billingAddress: address,
            shippingAddress: { sameAsBilling: true },
          }),
        },
      );
      if (!response.ok) throw new Error("Checkout preparation failed");
      setCheckout((await response.json()).data);
      setStatus("Checkout prepared");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function select(
    kind: "shipping-method" | "payment-method",
    id: string,
  ) {
    if (!runtime) return setError("Store configuration is not ready");
    if (!id) return;
    const response = await fetch(
      `${runtime.apiUrl}/v1/headless/carts/current/checkout/${kind}`,
      {
        method: "PUT",
        headers: headers(token, true),
        body: JSON.stringify({ id }),
      },
    );
    if (!response.ok) {
      setError("Selection failed");
      return;
    }
    setCheckout((await response.json()).data);
    setStatus(`${kind} selected`);
  }
  async function placeOrder() {
    if (!runtime || !checkout?.ready) return setError("Checkout is not ready");
    const selected = checkout.paymentMethods.find((method) => method.id === checkout.selectedPaymentMethodId);
    if (selected?.capabilities?.requiresHostedCheckout !== false || selected.capabilities.canPlaceOrder !== true) return setError("Choose a supported non-hosted payment method");
    const intent = orderIntent || crypto.randomUUID(); setOrderIntent(intent); setBusy(true); setError("");
    try {
      const response = await fetch(`${runtime.apiUrl}/v1/headless/carts/current/checkout/order`, { method: "POST", headers: { ...headers(token), "Idempotency-Key": intent } });
      if (!response.ok) { const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null; throw new Error(problem?.detail ?? problem?.title ?? `Order placement failed (${response.status})`); }
      setOrder((await response.json()).data); setStatus("Pending order placed");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Trail Mobile</IonTitle>
            <IonBadge slot="end">Cart {cart.items.length}</IonBadge>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <section>
            <small>IONIC + CAPACITOR</small>
            <h1>Outside is calling.</h1>
            <p>Capability-gated pending orders, without payment capture.</p>
          </section>
          {error && <p role="alert">{error}</p>}
          <p aria-live="polite">{status}</p>
          <div className="grid">
            {items.map((p) => (
              <IonCard key={p.id}>
                <IonCardHeader>
                  <IonCardTitle>{p.name}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p>{p.description}</p>
                  <b>${p.price.amount}</b>
                  <IonButton
                    data-product-id={p.id}
                    expand="block"
                    disabled={!p.available || busy}
                    onClick={() => add(p)}
                  >
                    Add {p.name} to cart
                  </IonButton>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
          {cart.items.length > 0 && (
            <IonCard className="checkout">
              <IonCardHeader>
                <IonCardTitle>Prepare checkout</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <form onSubmit={prepare}>
                  {[
                    ["firstName", "First name"],
                    ["lastName", "Last name"],
                    ["email", "Email"],
                    ["address1", "Address"],
                    ["city", "City"],
                    ["state", "State / province"],
                    ["postalCode", "Postal code"],
                    ["country", "Country code"],
                  ].map(([name, label]) => (
                    <label key={name}>
                      {label}
                      <input
                        name={name}
                        type={name === "email" ? "email" : "text"}
                        defaultValue={name === "country" ? "CA" : ""}
                        required
                      />
                    </label>
                  ))}
                  <IonButton type="submit" expand="block" disabled={busy}>
                    Load checkout choices
                  </IonButton>
                </form>
                {checkout && (
                  <div className="options">
                    <h2>
                      {checkout.ready ? "Ready for handoff" : "Still needed"}
                    </h2>
                    <p>
                      {checkout.missing.join(", ") || "No preparation gaps"}
                    </p>
                    <label>
                      Shipping
                      <select
                        aria-label="Shipping method"
                        value={checkout.selectedShippingMethodId ?? ""}
                        onChange={(e) =>
                          select("shipping-method", e.target.value)
                        }
                      >
                        <option value="">Choose shipping</option>
                        {checkout.shippingOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Payment
                      <select
                        aria-label="Payment method"
                        value={checkout.selectedPaymentMethodId ?? ""}
                        onChange={(e) =>
                          select("payment-method", e.target.value)
                        }
                      >
                        <option value="">Choose payment</option>
                        {checkout.paymentMethods.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!order && <IonButton expand="block" disabled={!checkout.ready || busy} onClick={placeOrder}>Place pending order</IonButton>}
                    {order && <section aria-label="Order confirmation"><h2>Order {order.orderNumber} placed</h2><p>Status: {order.status}</p><p>Payment: {order.paymentStatus}</p></section>}
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          )}
        </IonContent>
      </IonPage>
    </IonApp>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
