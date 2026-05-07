import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5" />
          <span>Baljia App</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
          Your app, generated. Yours to keep.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          This is a Baljia-generated application. It&rsquo;s a real Next.js
          codebase with auth, a database, payments, and AI wired in.
          Sign up to get started.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/sign-up">
            <Button size="lg">
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Built with Baljia · Next.js · Neon · Better Auth · Stripe
      </footer>
    </main>
  );
}
