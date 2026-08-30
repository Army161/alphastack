import { leaderboard, allPredictions, consensusView } from "@/lib/modules/verdict";
import { PageHeader } from "@/components/ui/PageHeader";
import { VerdictView } from "./VerdictView";

export const metadata = { title: "Verdict" };
export const dynamic = "force-dynamic";

export default async function VerdictPage() {
  const [board, predictions, consensus] = await Promise.all([
    leaderboard(),
    allPredictions(),
    consensusView(),
  ]);
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader moduleId="verdict" />
      <VerdictView
        board={board}
        predictions={predictions}
        consensus={consensus}
      />
    </div>
  );
}
