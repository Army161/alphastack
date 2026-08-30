import { redirect } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { OnboardingWizard } from "@/components/shell/OnboardingWizard";
import { completeOnboarding } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureSchema } from "@/lib/db/bootstrap";
import { UNIVERSE, getMarketContext } from "@/lib/data/market";

export const metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  await ensureSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const market = await getMarketContext();
  const prices = Object.fromEntries(
    UNIVERSE.map((a) => [a.symbol, market.quotes[a.symbol]?.price ?? a.anchorPrice])
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-700/40 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <Zap size={16} className="text-ink-950" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-ink-50">AlphaStack</span>
        </Link>
      </header>
      <div className="px-6 py-12">
        <OnboardingWizard action={completeOnboarding} prices={prices} />
      </div>
    </div>
  );
}
