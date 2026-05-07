import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppHome() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center gap-3">
        <Sparkles className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Welcome</h1>
      </div>

      <p className="mb-8 text-muted-foreground">
        This is your authenticated app shell. Specialist agents will add
        features here as you describe them in chat.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your database</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You have your own isolated Neon Postgres. Schema lives in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              db/schema.ts
            </code>
            .
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI is pre-wired</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Import{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              anthropic
            </code>{" "}
            or{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">openai</code>{" "}
            from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              @/lib/ai
            </code>{" "}
            — it&apos;s the official SDK pointed at Baljia&apos;s gateway.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
