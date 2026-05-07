import { describe, it, expect } from "vitest";

/**
 * Baseline smoke tests. These don't test features — they catch import-time
 * crashes (bad paths, missing exports, circular deps) that would otherwise
 * only surface at request time.
 *
 * Specialist agents add real tests for their features on top of these.
 * Verifier runs `pnpm test -- --run` and reports any failure.
 */

describe("smoke", () => {
  it("lib/utils cn() merges classes", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("a", "b", null, undefined, "c")).toBe("a b c");
  });

  it("lib/ai loads without crashing on missing env", async () => {
    // Runs under test env — AI_GATEWAY_URL may be absent. Should warn,
    // not throw, so builds can complete on fresh clones.
    const mod = await import("@/lib/ai");
    expect(mod).toHaveProperty("anthropic");
    expect(mod).toHaveProperty("openai");
    expect(mod.DEFAULT_MODEL).toMatch(/claude/);
  });

  it("db/schema exports the Better Auth tables", async () => {
    const schema = await import("@/db/schema");
    expect(schema).toHaveProperty("user");
    expect(schema).toHaveProperty("session");
    expect(schema).toHaveProperty("account");
    expect(schema).toHaveProperty("verification");
    expect(schema).toHaveProperty("subscription");
  });
});
