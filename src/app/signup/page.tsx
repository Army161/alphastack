import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/shell/AuthLayout";
import { AuthForm } from "@/components/shell/AuthForm";
import { Button, Divider } from "@/components/ui/primitives";
import { signUp, signInDemo } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureSchema } from "@/lib/db/bootstrap";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  await ensureSchema();
  const user = await getCurrentUser();
  if (user) redirect("/launchpad");

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="All seven modules on the free tier. No card required."
      footer={
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <Divider className="flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-ink-500">or</span>
            <Divider className="flex-1" />
          </div>
          <form action={signInDemo} className="mt-4">
            <Button type="submit" variant="outline" size="lg" className="w-full">
              <Sparkles size={14} /> Skip — explore the demo
            </Button>
          </form>
        </div>
      }
    >
      <AuthForm mode="signup" action={signUp} />
    </AuthLayout>
  );
}
