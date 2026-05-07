# Baljia app skeleton

This is the template repository the Baljia **Scaffold Agent** clones when
bootstrapping a new user-app. It's a normal Next.js 15 + Neon + Better Auth +
Stripe + AI SDK stack, set up the way Baljia expects every generated app to be.

**This repo is not the app.** It's the *starting point* for every generated
app. Specialist agents edit files on top of it.

## What's pre-wired

| Piece | Where | Notes |
| --- | --- | --- |
| **Auth** | `lib/auth.ts` + `app/api/auth/[...all]` | Better Auth. Email/password works out of the box. Drop Google/GitHub client IDs in env and those providers light up automatically. |
| **Database** | `db/index.ts` + `db/schema.ts` | Drizzle + Neon HTTP driver. Schema comes pre-seeded with Better Auth tables + `subscription`, `stripe_event`, and a demo `todo` table. |
| **AI** | `lib/ai.ts` | Anthropic SDK, OpenAI SDK, and Vercel AI SDK — all pointed at the Baljia gateway via `AI_GATEWAY_URL` + `AI_GATEWAY_TOKEN`. Use the official APIs; the gateway handles BYOK vs platform-key routing transparently. |
| **Payments** | `lib/stripe.ts` + `app/actions/billing.ts` + `app/api/webhooks/stripe` | Subscription checkout with idempotent webhook handling. |
| **UI** | Tailwind 4 + Shadcn (new-york, zinc) | `button`, `input`, `label`, `card` shipped. Agent runs `pnpm dlx shadcn@latest add <name>` for more. |

## Stack decisions (locked — don't plan migrations off these)

- **Next.js 15** (App Router, Server Actions, Server Components by default)
- **React 19**
- **Drizzle ORM** — no Prisma, no raw SQL migrations
- **Neon Postgres** — use `@neondatabase/serverless` for edge compatibility
- **Better Auth** — no Clerk/NextAuth inside generated apps (code ownership)
- **Stripe Subscriptions** — checkout-first, no Payment Element by default
- **Tailwind 4 + Shadcn (new-york, zinc)** — CSS variables, `cn()` from `@/lib/utils`
- **pnpm** — not npm, not yarn, not bun

## Directory structure

```
app/
├── layout.tsx             root shell + <Toaster/>
├── globals.css            Tailwind 4 + Shadcn CSS vars (zinc)
├── page.tsx               public landing
├── (auth)/                sign-in, sign-up
├── app/                   authenticated shell (middleware-protected)
│   ├── layout.tsx         guards via getSession()
│   ├── page.tsx           demo dashboard
│   └── settings/page.tsx  subscription
├── actions/               server actions ("use server")
│   └── billing.ts         Stripe checkout
└── api/
    ├── auth/[...all]      Better Auth catch-all
    └── webhooks/stripe    Stripe event ingestion

components/
├── ui/                    Shadcn primitives — button, input, label, card
├── providers/             Toaster
└── shell/                 Header (user menu, sign-out)

db/
├── index.ts               drizzle client (Neon HTTP)
└── schema.ts              all tables

lib/
├── auth.ts                Better Auth server
├── auth-client.ts         Better Auth client
├── ai.ts                  AI SDKs wired to gateway  ← the Baljia integration point
├── stripe.ts              Stripe client + priceId()
└── utils.ts               cn(), getSession(), requireSession()

middleware.ts              edge-fast /app/* gate
```

## Conventions agents must follow

1. **Server Components by default.** Only add `"use client"` when you need
   `useState`, `useEffect`, `useTransition`, an event handler, or Shadcn
   primitives that transitively use them (Label, Tabs, etc.).
2. **Server actions, not API routes, for app mutations.** New routes are
   only for webhooks and third-party callbacks.
3. **Scope every query by user.** Every `db.query.X.findMany()` that returns
   user data must include `where: eq(X.userId, session.user.id)`. This is a
   hard rule — there's no row-level security layer to catch mistakes.
4. **Use `@/lib/ai`, never `new Anthropic({...})` elsewhere.** That file is the
   single surface for AI access and carries the gateway config.
5. **Use `fs.patch` over `fs.write` for small edits.** Cheaper, less
   regression risk.

## Running locally

```bash
pnpm install
cp .env.example .env.local
# Fill DATABASE_URL (Neon), AI_GATEWAY_URL/TOKEN (from Baljia)
# Generate a secret:  openssl rand -base64 32  →  BETTER_AUTH_SECRET

pnpm db:push        # applies schema to Neon
pnpm dev            # http://localhost:3000
```

For Stripe testing:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

## Build hygiene (the agents check this)

The Verifier Agent runs these in order after every generation step.
If any fails, the last specialist agent is asked to fix it once before the
generation is marked failed:

```bash
pnpm tsc --noEmit       # type check
pnpm build              # next build
pnpm dev   # smoke      # (via shell.spawn, 8s wait, scan logs)
```

## What Baljia owns vs what you own

- **You own**: all the code in this repo once it's cloned into your project.
  Full code ownership. Export anywhere, deploy anywhere.
- **Baljia owns**: the generator, the gateway, and (optionally) your
  deployment runtime. If you walk away, your code keeps working — you'd
  just need to drop in a direct Anthropic API key in place of the gateway
  token, and the app runs standalone.
