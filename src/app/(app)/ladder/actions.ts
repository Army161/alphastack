"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { holdings, ladderRungs, users } from "@/lib/db/schema";
import { getSessionUserId } from "@/lib/auth/session";
import { getMarketContext } from "@/lib/data/market";
import { suggestLadder } from "@/lib/modules/ladder";

async function uid() {
  const id = await getSessionUserId();
  if (!id) throw new Error("Not authenticated");
  return id;
}

export async function addHolding(fd: FormData) {
  const userId = await uid();
  const symbol = String(fd.get("symbol") ?? "BTC").toUpperCase();
  const quantity = Number(fd.get("quantity"));
  const market = await getMarketContext([symbol]);
  const costBasis = Number(fd.get("costBasis")) || market.quotes[symbol]?.price || 0;
  if (!Number.isFinite(quantity) || quantity <= 0) return;

  await db.insert(holdings).values({
    id: nanoid(),
    userId,
    symbol,
    quantity,
    costBasis,
    createdAt: new Date(),
  });
  revalidatePath("/ladder");
  revalidatePath("/launchpad");
}

/** Positions are aggregated by symbol in the UI, so removal is by symbol. */
export async function removeHolding(fd: FormData) {
  const userId = await uid();
  const symbol = String(fd.get("id") ?? fd.get("symbol") ?? "").toUpperCase();
  if (!symbol) return;
  await db
    .delete(holdings)
    .where(and(eq(holdings.symbol, symbol), eq(holdings.userId, userId)));
  revalidatePath("/ladder");
  revalidatePath("/launchpad");
}

export async function addRung(fd: FormData) {
  const userId = await uid();
  const symbol = String(fd.get("symbol") ?? "BTC").toUpperCase();
  const triggerPrice = Number(fd.get("triggerPrice"));
  const sellPct = Number(fd.get("sellPct"));
  const note = String(fd.get("note") ?? "") || null;
  if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) return;
  if (!Number.isFinite(sellPct) || sellPct <= 0 || sellPct > 100) return;

  const market = await getMarketContext([symbol]);
  const spot = market.quotes[symbol]?.price ?? 0;
  await db.insert(ladderRungs).values({
    id: nanoid(),
    userId,
    symbol,
    triggerPrice,
    sellPct,
    note,
    status: spot >= triggerPrice ? "triggered" : "armed",
    triggeredAt: spot >= triggerPrice ? new Date() : null,
    createdAt: new Date(),
  });
  revalidatePath("/ladder");
  revalidatePath("/launchpad");
}

export async function removeRung(fd: FormData) {
  const userId = await uid();
  const id = String(fd.get("id"));
  await db.delete(ladderRungs).where(and(eq(ladderRungs.id, id), eq(ladderRungs.userId, userId)));
  revalidatePath("/ladder");
  revalidatePath("/launchpad");
}

export async function setRungStatus(fd: FormData) {
  const userId = await uid();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!["armed", "triggered", "executed", "skipped"].includes(status)) return;

  await db
    .update(ladderRungs)
    .set({
      status,
      actedAt: status === "executed" || status === "skipped" ? new Date() : null,
    })
    .where(and(eq(ladderRungs.id, id), eq(ladderRungs.userId, userId)));
  revalidatePath("/ladder");
  revalidatePath("/launchpad");
}

export async function setRiskProfile(fd: FormData) {
  const userId = await uid();
  const profile = String(fd.get("riskProfile"));
  if (!["conservative", "balanced", "aggressive"].includes(profile)) return;
  await db.update(users).set({ riskProfile: profile }).where(eq(users.id, userId));
  revalidatePath("/ladder");
}

/** Generate the default cycle-anchored ladder for a position. */
export async function generateLadder(fd: FormData) {
  const userId = await uid();
  const symbol = String(fd.get("symbol") ?? "BTC").toUpperCase();

  const rows = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, userId), eq(holdings.symbol, symbol)));
  const qty = rows.reduce((s, r) => s + r.quantity, 0);
  if (qty <= 0) return;

  const existing = await db
    .select()
    .from(ladderRungs)
    .where(and(eq(ladderRungs.userId, userId), eq(ladderRungs.symbol, symbol)));

  const tiers = await suggestLadder(symbol, qty);
  const market = await getMarketContext([symbol]);
  const spot = market.quotes[symbol]?.price ?? 0;
  for (const t of tiers) {
    if (existing.some((e) => Math.abs(e.triggerPrice - t.triggerPrice) < t.triggerPrice * 0.01)) {
      continue;
    }
    await db.insert(ladderRungs).values({
      id: nanoid(),
      userId,
      symbol,
      triggerPrice: t.triggerPrice,
      sellPct: t.sellPct,
      note: t.note,
      status: spot >= t.triggerPrice ? "triggered" : "armed",
      createdAt: new Date(),
    });
  }
  revalidatePath("/ladder");
  revalidatePath("/launchpad");
}
