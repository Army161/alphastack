import { computeCatalysts } from "@/lib/modules/catalyst";
import { PageHeader } from "@/components/ui/PageHeader";
import { CatalystView } from "./CatalystView";

export const metadata = { title: "Catalyst" };
export const dynamic = "force-dynamic";

export default async function CatalystPage() {
  const report = await computeCatalysts();
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader moduleId="catalyst" />
      <CatalystView report={report} />
    </div>
  );
}
