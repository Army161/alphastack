import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/shell/AuthLayout";
import { AuthForm } from "@/components/shell/AuthForm";
import { Button, Divider } from "@/components/ui/primitives";
import { signIn, signInDemo } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureSchema } from "@/lib/db/bootstrap";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  await ensureSchema();
  const user = await getCurrentUser();
  if (user) redirect("/launchpad");

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your workspace."
      footer={
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <Divider className="flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-ink-500">or</span>
            <Divider className="flex-1" />
          </div>
          <form action={signInDemo} className="mt-4">
            <Button type="submit" variant="outline" size="lg" className="w-full">
              <Sparkles size={14} /> Enter the live demo
            </Button>
          </form>
          <p className="mt-2.5 text-center text-[11.5px] text-ink-500">
            Pre-loaded portfolio, exit ladder and alert history. Operator plan unlocked.
          </p>
        </div>
      }
    >
      <AuthForm mode="signin" action={signIn} />
    </AuthLayout>
  );
}
