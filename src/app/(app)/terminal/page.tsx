import { screen, marketOverview } from "@/lib/modules/terminal";
import { getMarketContext } from "@/lib/data/market";
import { PageHeader } from "@/components/ui/PageHeader";
import { TerminalView } from "./TerminalView";

export const metadata = { title: "Terminal" };
export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  const market = await getMarketContext();  // universe-wide: live quotes, modelled paths
  const rows = await screen(market);
  const overview = await marketOverview(market);
  const series = Object.fromEntries(
    rows.map((r) => [
      r.symbol,
      (market.series[r.symbol] ?? []).map((c) => ({ t: c.t, c: c.c })),
    ])
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader moduleId="terminal" />
      <TerminalView rows={rows} overview={overview} series={series} />
    </div>
  );
}
