import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

const PLAN_LIMITS: Record<string, { plan: string; maxBrands: number; maxQueries: number; frequency: string }> = {
  starter: { plan: "starter", maxBrands: 3, maxQueries: 40, frequency: "biweekly" },
  professional: { plan: "professional", maxBrands: 10, maxQueries: 50, frequency: "weekly" },
  enterprise: { plan: "enterprise", maxBrands: 50, maxQueries: 50, frequency: "weekly" },
};

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const supabase = await createServiceClient();
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  // Determine plan from price ID
  let planKey = "starter";
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) planKey = "professional";
  else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) planKey = "enterprise";

  const limits = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.starter;

  await supabase
    .from("organizations")
    .update({
      stripe_subscription_id: subscription.id,
      plan: limits.plan,
      plan_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      max_brands: limits.maxBrands,
      max_queries_per_audit: limits.maxQueries,
      audit_frequency: limits.frequency,
    })
    .eq("stripe_customer_id", customerId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await handleSubscriptionCreated(subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = await createServiceClient();
  const customerId = subscription.customer as string;

  await supabase
    .from("organizations")
    .update({
      stripe_subscription_id: null,
      plan: "free",
      plan_period_end: null,
      max_brands: 1,
      max_queries_per_audit: 20,
      audit_frequency: "monthly",
    })
    .eq("stripe_customer_id", customerId);
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
