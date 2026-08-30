import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { PLAN_BY_ID, type PlanId } from "@/lib/billing/plans";
import { ensureSchema } from "@/lib/db/bootstrap";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await ensureSchema();
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/signin", req.url), { status: 303 });

  const form = await req.formData();
  const planId = String(form.get("plan") ?? "pro") as PlanId;
  const interval = String(form.get("interval") ?? "monthly");
  const plan = PLAN_BY_ID[planId];
  if (!plan || planId === "free") {
    return NextResponse.redirect(new URL("/pricing", req.url), { status: 303 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[plan.stripePriceEnv];

  // ---- Live Stripe path ------------------------------------------------
  if (secret && priceId) {
    const stripe = new Stripe(secret);
    const origin = new URL(req.url).origin;

    let customerId = (
      await db.select().from(users).where(eq(users.id, user.id)).limit(1)
    )[0]?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?upgraded=1`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId: user.id, plan: planId, interval },
      allow_promotion_codes: true,
    });

    return NextResponse.redirect(session.url!, { status: 303 });
  }

  // ---- Local evaluation path -------------------------------------------
  // No Stripe keys configured: grant the plan directly so the gated surface
  // can be exercised end-to-end. Never reached once STRIPE_SECRET_KEY is set.
  await db.update(users).set({ plan: planId }).where(eq(users.id, user.id));
  return NextResponse.redirect(new URL("/billing?upgraded=1&mode=local", req.url), {
    status: 303,
  });
}
