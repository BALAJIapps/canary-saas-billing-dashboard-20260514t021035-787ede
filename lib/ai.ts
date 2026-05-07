/**
 * AI client — pre-wired to the Baljia AI Gateway.
 *
 * The gateway is wire-compatible with Anthropic's /v1/messages and OpenAI's
 * /v1/chat/completions. You use the official SDKs with nothing changed but
 * the base URL and API key. The gateway decides whether to route your call
 * through your own BYOK key (if you pasted one in Settings) or the Baljia
 * platform key (on the free tier, subject to monthly token quota).
 *
 * When you go BYOK, nothing in your code changes. The switch happens in
 * Baljia's control plane.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { anthropic as anthropicProvider } from "@ai-sdk/anthropic";
import { createAnthropic } from "@ai-sdk/anthropic";

const baseURL = process.env.AI_GATEWAY_URL;
const apiKey = process.env.AI_GATEWAY_TOKEN;

if (!baseURL || !apiKey) {
  // Warn loudly in dev; don't throw because builds (which don't make calls)
  // would fail on clones that haven't filled env yet.
  if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(
      "[ai] AI_GATEWAY_URL / AI_GATEWAY_TOKEN not set — AI features will fail at runtime.",
    );
  }
}

/**
 * Official Anthropic SDK pointed at the Baljia gateway.
 * Use for single-turn calls, streaming, and anything SDK-native.
 */
export const anthropic = new Anthropic({
  baseURL,
  apiKey: apiKey ?? "not-set",
});

/**
 * Official OpenAI SDK pointed at the Baljia gateway.
 */
export const openai = new OpenAI({
  baseURL: baseURL ? `${baseURL}/v1` : undefined,
  apiKey: apiKey ?? "not-set",
});

/**
 * Vercel AI SDK provider, also pointed at the gateway.
 * Use this for streamText / generateText / useChat.
 */
export const ai = createAnthropic({
  baseURL,
  apiKey: apiKey ?? "not-set",
});

/** Default model — override per-call if you need Opus or Haiku. */
export const DEFAULT_MODEL = "claude-sonnet-4-6";

// Re-export the raw provider alias so `import { anthropic as ai } from ...`
// works if you prefer that style
export { anthropicProvider as anthropicAISDK };
