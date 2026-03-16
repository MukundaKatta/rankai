import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { getOrCreateCustomer } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { userId, email, orgName } = await request.json();

    if (!userId || !email || !orgName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const slug = slugify(orgName);

    // Create Stripe customer
    let stripeCustomerId: string | null = null;
    try {
      stripeCustomerId = await getOrCreateCustomer(email, orgName);
    } catch {
      // Stripe may not be configured in dev; continue without it
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug: `${slug}-${Date.now().toString(36)}`,
        owner_id: userId,
        stripe_customer_id: stripeCustomerId,
      })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Add user as owner member
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ organizationId: org.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
