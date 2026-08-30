"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, holdings, ladderRungs, notifications } from "@/lib/db/schema";
import { createSession, destroySession, getSessionUserId } from "./session";
import { ensureSchema } from "@/lib/db/bootstrap";
import { getMarketContext } from "@/lib/data/market";

const credentials = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().optional(),
});

export type AuthState = { error?: string; ok?: boolean };

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  await ensureSchema();
  const parsed = credentials.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, password, name } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { error: "An account with that email already exists." };

  const id = nanoid();
  await db.insert(users).values({
    id,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    name: name ?? null,
    plan: "free",
    createdAt: new Date(),
  });

  await db.insert(notifications).values({
    id: nanoid(),
    userId: id,
    moduleId: "platform",
    severity: "info",
    title: "Welcome to AlphaStack",
    body: "Your workspace is live. Start with the Launchpad to see all seven modules, or ask the agent anything in ChatOS.",
    createdAt: new Date(),
  });

  await createSession(id);
  redirect("/onboarding");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  await ensureSchema();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user) return { error: "No account found with that email." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password." };

  await createSession(user.id);
  redirect(user.onboardedAt ? "/launchpad" : "/onboarding");
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}

const DEMO_EMAIL = "demo@alphastack.io";
const DEMO_PASSWORD = "demo12345";

/** One-click demo account so the platform can be evaluated instantly. */
export async function signInDemo() {
  await ensureSchema();
  const rows = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  let user = rows[0];

  if (!user) {
    const id = nanoid();
    await db.insert(users).values({
      id,
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      name: "Demo Operator",
      plan: "pro",
      riskProfile: "balanced",
      onboardedAt: new Date(),
      createdAt: new Date(),
    });

    const seedHoldings = [
      { symbol: "BTC", quantity: 1.85, costBasis: 42000 },
      { symbol: "ETH", quantity: 14, costBasis: 2050 },
      { symbol: "SOL", quantity: 210, costBasis: 96 },
      { symbol: "XRP", quantity: 12000, costBasis: 1.1 },
      { symbol: "HYPE", quantity: 900, costBasis: 18.5 },
    ];
    for (const h of seedHoldings) {
      await db.insert(holdings).values({
        id: nanoid(),
        userId: id,
        symbol: h.symbol,
        quantity: h.quantity,
        costBasis: h.costBasis,
        createdAt: new Date(),
      });
    }

    const rungSeed = [
      { symbol: "BTC", triggerPrice: 100000, sellPct: 5, note: "Midterm momentum target" },
      { symbol: "BTC", triggerPrice: 115000, sellPct: 10, note: "Year-end bull case" },
      { symbol: "BTC", triggerPrice: 145000, sellPct: 15, note: "Above prior ATH" },
      { symbol: "BTC", triggerPrice: 300000, sellPct: 20, note: "2030 conservative target" },
      { symbol: "SOL", triggerPrice: 400, sellPct: 20, note: "3x from spot" },
      { symbol: "HYPE", triggerPrice: 82, sellPct: 25, note: "CFTC clearance case" },
    ];
    const market = await getMarketContext();
    for (const r of rungSeed) {
      // Compare each rung against its OWN asset's price, not BTC's.
      const hit = (market.quotes[r.symbol]?.price ?? 0) >= r.triggerPrice;
      await db.insert(ladderRungs).values({
        id: nanoid(),
        userId: id,
        symbol: r.symbol,
        triggerPrice: r.triggerPrice,
        sellPct: r.sellPct,
        note: r.note,
        status: hit ? "triggered" : "armed",
        triggeredAt: hit ? new Date() : null,
        createdAt: new Date(),
      });
    }

    await db.insert(notifications).values([
      {
        id: nanoid(),
        userId: id,
        moduleId: "radar",
        severity: "critical",
        title: "Liquidation cluster within 3% of spot",
        body: "Long liquidations are stacked just below price. Crowding index has moved into the upper band — a flush toward that level resets positioning.",
        createdAt: new Date(Date.now() - 1000 * 60 * 22),
      },
      {
        id: nanoid(),
        userId: id,
        moduleId: "exhaustion",
        severity: "info",
        title: "SES regime change: Accumulation → Recovery",
        body: "The composite crossed 58. Miner net position and ETF flow both flipped positive on the same session.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
      {
        id: nanoid(),
        userId: id,
        moduleId: "ladder",
        severity: "warn",
        title: "Rung armed: BTC $100,000",
        body: "Your first take-profit tier is now the nearest rung. 5% of the BTC position is earmarked at that level.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
    ]);

    user = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  }

  await createSession(user.id);
  redirect("/launchpad");
}

export async function completeOnboarding(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/signin");

  const profile = String(formData.get("riskProfile") ?? "balanced");
  const raw = String(formData.get("holdings") ?? "[]");

  await db
    .update(users)
    .set({ riskProfile: profile, onboardedAt: new Date() })
    .where(eq(users.id, userId));

  const onboardCtx = await getMarketContext();
  const ctxPrices: Record<string, number> = Object.fromEntries(
    Object.entries(onboardCtx.quotes).map(([k, v]) => [k, v.price])
  );
  try {
    const parsed = JSON.parse(raw) as { symbol: string; quantity: number; costBasis: number }[];
    for (const h of parsed) {
      if (!h.symbol || !Number.isFinite(h.quantity) || h.quantity <= 0) continue;
      await db.insert(holdings).values({
        id: nanoid(),
        userId,
        symbol: h.symbol,
        quantity: h.quantity,
        costBasis: Number.isFinite(h.costBasis) ? h.costBasis : ctxPrices[h.symbol] ?? 0,
        createdAt: new Date(),
      });
    }
  } catch {
    /* onboarding holdings are optional */
  }

  revalidatePath("/launchpad");
  redirect("/launchpad");
}
