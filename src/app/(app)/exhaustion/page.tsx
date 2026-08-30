import { computeExhaustion } from "@/lib/modules/exhaustion";
import { UNIVERSE } from "@/lib/data/market";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExhaustionView } from "./ExhaustionView";

export const metadata = { title: "Exhaustion" };
export const dynamic = "force-dynamic";

export default async function ExhaustionPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const params = await searchParams;
  const assets = UNIVERSE.filter((a) => a.tier !== "watch").map((a) => a.symbol);
  const asset = assets.includes((params.asset ?? "").toUpperCase())
    ? params.asset!.toUpperCase()
    : "BTC";
  const reading = await computeExhaustion(asset);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader moduleId="exhaustion" />
      <ExhaustionView reading={reading} assets={assets} asset={asset} />
    </div>
  );
}
