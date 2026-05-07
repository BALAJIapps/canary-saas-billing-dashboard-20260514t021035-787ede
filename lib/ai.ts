/**
 * AI client — pre-wired for founder apps.
 *
 * Dev/staging: Uses Google Gemini (free tier, OpenAI-compatible endpoint).
 * Production:  Swap AI_GATEWAY_URL + AI_GATEWAY_TOKEN to point at the
 *              Baljia AI Gateway for per-company billing and model switching.
 *
 * Zero-key policy: founders never paste API keys. The platform operator
 * sets these env vars once and all apps share them.
 */

import OpenAI from "openai";

const baseURL = process.env.AI_GATEWAY_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai";
const apiKey = process.env.AI_GATEWAY_TOKEN ?? process.env.GEMINI_API_KEY ?? "";

if (!apiKey && process.env.NODE_ENV !== "production") {
  console.warn(
    "[ai] AI_GATEWAY_TOKEN / GEMINI_API_KEY not set — AI features will fail at runtime.",
  );
}

/**
 * OpenAI-compatible client pointed at Gemini (or the Baljia gateway in prod).
 * Gemini's OpenAI-compatible endpoint accepts the same request format.
 * Default model: gemini-2.0-flash (fast, free tier, large context).
 */
export const openai = new OpenAI({
  baseURL,
  apiKey,
});

/** Default model for text generation. Override per-call for heavier tasks. */
export const DEFAULT_MODEL = "gemini-2.0-flash";

/** Faster/cheaper model for simple tasks (classification, extraction). */
export const FAST_MODEL = "gemini-2.0-flash";

/** Powerful model for complex reasoning tasks. */
export const SMART_MODEL = "gemini-2.5-pro";

/** Embedding model for semantic search. */
export const EMBEDDING_MODEL = "text-embedding-004";

/**
 * Tavily search client — for web search inside founder apps.
 * Use this for real-time information, research features, and RAG pipelines.
 */
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
export const TAVILY_API_URL = "https://api.tavily.com";

/**
 * Search the web via Tavily.
 * Returns top results with title, URL, and snippet.
 *
 * @example
 * const results = await tavilySearch("latest news on AI agents");
 */
export async function tavilySearch(
  query: string,
  options?: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeAnswer?: boolean;
  },
): Promise<{
  answer?: string;
  results: Array<{ title: string; url: string; content: string; score: number }>;
}> {
  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  const res = await fetch(`${TAVILY_API_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: options?.maxResults ?? 5,
      search_depth: options?.searchDepth ?? "basic",
      include_answer: options?.includeAnswer ?? false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.statusText}`);
  }

  return res.json();
}
