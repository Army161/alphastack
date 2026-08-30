import { SAMPLE_CONTRACT } from "@/lib/modules/sentinel";
import { PageHeader } from "@/components/ui/PageHeader";
import { SentinelView } from "./SentinelView";

export const metadata = { title: "Sentinel" };

export default function SentinelPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader moduleId="sentinel" />
      <SentinelView sample={SAMPLE_CONTRACT} />
    </div>
  );
}
