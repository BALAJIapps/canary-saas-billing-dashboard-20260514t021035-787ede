import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === "production") {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export function priceId(): string {
  const id = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
  if (!id) throw new Error("NEXT_PUBLIC_STRIPE_PRICE_ID is not set");
  return id;
}
