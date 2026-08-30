import { computeRadar } from "@/lib/modules/radar";
import { UNIVERSE } from "@/lib/data/market";
import { PageHeader } from "@/components/ui/PageHeader";
import { RadarView } from "./RadarView";

export const metadata = { title: "Radar" };
export const dynamic = "force-dynamic";

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const params = await searchParams;
  const assets = UNIVERSE.filter((a) => a.tier !== "watch").map((a) => a.symbol);
  const asset = assets.includes((params.asset ?? "").toUpperCase())
    ? params.asset!.toUpperCase()
    : "BTC";
  const reading = await computeRadar(asset);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader moduleId="radar" />
      <RadarView reading={reading} assets={assets} asset={asset} />
    </div>
  );
}
