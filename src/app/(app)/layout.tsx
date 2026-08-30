import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { AppShell } from "@/components/shell/AppShell";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureSchema } from "@/lib/db/bootstrap";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const unread = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  return (
    <AppShell
      user={{ name: user.name, email: user.email, plan: user.plan }}
      unread={unread.length}
    >
      {children}
    </AppShell>
  );
}
