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
type Option = { id: string; name: string };
type Checkout = {
  shippingOptions: Option[];
  paymentMethods: Option[];
  selectedShippingMethodId: string | null;
  selectedPaymentMethodId: string | null;
  ready: boolean;
  missing: string[];
};
const base = (import.meta.env.VITE_HEADLESS_API_URL ?? "").replace(/\/$/, "");
const key = import.meta.env.VITE_HEADLESS_PUBLISHABLE_KEY ?? "";
function App() {
  const [items, setItems] = useState<Product[]>([]),
    [cart, setCart] = useState<Cart>({ items: [] }),
    [token, setToken] = useState(
      () => sessionStorage.getItem("headless-cart-token") ?? "",
    ),
    [checkout, setCheckout] = useState<Checkout | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const headers = (cartToken?: string, json = false) => ({
    ...(key ? { "x-publishable-key": key } : {}),
    ...(cartToken ? { "x-cart-token": cartToken } : {}),
    ...(json ? { "content-type": "application/json" } : {}),
  });
  useEffect(() => {
    fetch(base ? `${base}/v1/headless/products` : "/products.json", {
      headers: headers(),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Catalog unavailable");
        return r.json();
      })
      .then((v) => setItems(v.data))
      .catch((e) => setError(e.message));
  }, []);
  async function ensureCart() {
    if (token) return token;
    const response = await fetch(`${base}/v1/headless/carts`, {
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
    if (!base) {
      setCart((value) => ({
        items: [...value.items, { id: product.id, quantity: 1 }],
      }));
      setStatus("Synthetic demo only; configure a live sandbox for checkout");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const current = await ensureCart();
      const response = await fetch(`${base}/v1/headless/carts/current/items`, {
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
    if (!base) return;
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
        `${base}/v1/headless/carts/current/checkout`,
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
    if (!id) return;
    const response = await fetch(
      `${base}/v1/headless/carts/current/checkout/${kind}`,
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
            <p>Preparation only—no order placement or payment capture.</p>
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
