import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    brands: 1,
    queriesPerAudit: 20,
    auditFrequency: "monthly" as const,
    features: [
      "1 brand",
      "20 queries per audit",
      "Monthly audits",
      "Basic visibility score",
      "2 AI models (ChatGPT + Claude)",
    ],
  },
  starter: {
    name: "Starter",
    price: 49,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    brands: 3,
    queriesPerAudit: 40,
    auditFrequency: "biweekly" as const,
    features: [
      "3 brands",
      "40 queries per audit",
      "Biweekly audits",
      "All 4 AI models",
      "Content recommendations",
      "Competitor tracking (3)",
      "Email reports",
    ],
  },
  professional: {
    name: "Professional",
    price: 149,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID ?? "",
    brands: 10,
    queriesPerAudit: 50,
    auditFrequency: "weekly" as const,
    features: [
      "10 brands",
      "50 queries per audit",
      "Weekly audits",
      "All 4 AI models",
      "AI-generated content",
      "Structured data generator",
      "Competitor tracking (10)",
      "Priority support",
      "API access",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 499,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    brands: 50,
    queriesPerAudit: 50,
    auditFrequency: "weekly" as const,
    features: [
      "50 brands",
      "50 queries per audit",
      "Weekly audits",
      "All 4 AI models",
      "Unlimited content generation",
      "White-label reports",
      "Custom probe queries",
      "Dedicated account manager",
      "SSO/SAML",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url!;
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function getOrCreateCustomer(
  email: string,
  name?: string
): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({ email, name });
  return customer.id;
}
