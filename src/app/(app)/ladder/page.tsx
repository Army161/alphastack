import { eq } from "drizzle-orm";
import { evaluateLadder, type Holding, type Rung, type RiskProfile } from "@/lib/modules/ladder";
import { UNIVERSE, getMarketContext } from "@/lib/data/market";
import { db } from "@/lib/db";
import { holdings, ladderRungs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { LadderView } from "./LadderView";
import {
  addHolding, removeHolding, addRung, removeRung,
  setRungStatus, setRiskProfile, generateLadder,
} from "./actions";

export const metadata = { title: "Ladder" };
export const dynamic = "force-dynamic";

export default async function LadderPage() {
  const user = (await getCurrentUser())!;

  const rawHoldings = await db.select().from(holdings).where(eq(holdings.userId, user.id));
  const rawRungs = await db.select().from(ladderRungs).where(eq(ladderRungs.userId, user.id));

  // Aggregate duplicate symbols into a single weighted position.
  const merged = new Map<string, Holding>();
  for (const h of rawHoldings) {
    const cur = merged.get(h.symbol);
    if (cur) {
      const totalQty = cur.quantity + h.quantity;
      cur.costBasis = (cur.costBasis * cur.quantity + h.costBasis * h.quantity) / totalQty;
      cur.quantity = totalQty;
    } else {
      merged.set(h.symbol, {
        id: h.id,
        symbol: h.symbol,
        quantity: h.quantity,
        costBasis: h.costBasis,
      });
    }
  }

  const rungs: Rung[] = rawRungs.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    triggerPrice: r.triggerPrice,
    sellPct: r.sellPct,
    note: r.note,
    status: r.status as Rung["status"],
    triggeredAt: r.triggeredAt ? r.triggeredAt.getTime() : null,
    actedAt: r.actedAt ? r.actedAt.getTime() : null,
  }));

  const profile = (user.riskProfile as RiskProfile) ?? "balanced";
  const market = await getMarketContext();
  const report = await evaluateLadder([...merged.values()], rungs, profile, market);
  const prices = Object.fromEntries(
    UNIVERSE.map((a) => [a.symbol, market.quotes[a.symbol]?.price ?? a.anchorPrice])
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader moduleId="ladder" />
      <LadderView
        report={report}
        symbols={UNIVERSE.map((a) => a.symbol)}
        prices={prices}
        riskProfile={profile}
        actions={{
          addHolding, removeHolding, addRung, removeRung,
          setRungStatus, setRiskProfile, generateLadder,
        }}
      />
    </div>
  );
}
