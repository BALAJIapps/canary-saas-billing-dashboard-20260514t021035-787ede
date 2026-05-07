import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { subscription } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { startCheckout } from "@/app/actions/billing";

export default async function SettingsPage() {
  const session = await requireSession();

  const sub = await db.query.subscription.findFirst({
    where: eq(subscription.userId, session.user.id),
  });

  const active = sub?.status === "active" || sub?.status === "trialing";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session.user.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {active
              ? `Active — renews ${sub?.currentPeriodEnd?.toLocaleDateString() ?? "soon"}.`
              : "No active subscription."}
          </p>
          {!active && (
            <form action={startCheckout}>
              <Button type="submit">Upgrade</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
