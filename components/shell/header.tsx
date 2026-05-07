"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, Sparkles, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

interface HeaderProps {
  user: { id: string; name: string; email: string; image?: string | null };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/app" className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-5 w-5" />
        <span>Baljia App</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user.email}
        </span>
        <Link href="/app/settings">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
