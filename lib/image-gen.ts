/**
 * AI image generation for generated apps.
 *
 * Supports:
 *   1. OpenAI DALL-E 3 (best quality, $0.04/image)
 *   2. Stability AI (SDXL, cheaper at scale)
 *   3. Replicate (any model — Flux, SDXL, etc.)
 *
 * Provider detection: checks env vars in order.
 *
 * Usage:
 *   import { generateImage } from "@/lib/image-gen";
 *   const result = await generateImage("a cat wearing a hat");
 *   // result.url → the generated image URL
 */

export interface ImageGenResult {
  url: string;
  revisedPrompt?: string;
  provider: string;
}

type ImageProvider = "openai" | "stability" | "replicate";

function detectProvider(): ImageProvider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.STABILITY_API_KEY) return "stability";
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  throw new Error(
    "No image generation API key found. Set OPENAI_API_KEY, STABILITY_API_KEY, or REPLICATE_API_TOKEN."
  );
}

export async function generateImage(
  prompt: string,
  options?: {
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    provider?: ImageProvider;
  },
): Promise<ImageGenResult> {
  const provider = options?.provider || detectProvider();

  switch (provider) {
    case "openai":
      return generateWithOpenAI(prompt, options);
    case "stability":
      return generateWithStability(prompt, options);
    case "replicate":
      return generateWithReplicate(prompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ── OpenAI DALL-E 3 ───────────────────────────────────────────────

async function generateWithOpenAI(
  prompt: string,
  options?: { size?: string; quality?: string; style?: string },
): Promise<ImageGenResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: options?.size || "1024x1024",
      quality: options?.quality || "standard",
      style: options?.style || "vivid",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI image generation failed: ${err}`);
  }

  const data = await resp.json();
  return {
    url: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt,
    provider: "openai",
  };
}

// ── Stability AI ──────────────────────────────────────────────────

async function generateWithStability(
  prompt: string,
  options?: { size?: string },
): Promise<ImageGenResult> {
  const key = process.env.STABILITY_API_KEY;
  if (!key) throw new Error("STABILITY_API_KEY not set");

  const resp = await fetch(
    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
        accept: "application/json",
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        width: 1024,
        height: 1024,
        samples: 1,
        steps: 30,
      }),
    },
  );

  if (!resp.ok) throw new Error(`Stability AI error: ${resp.status}`);

  const data = await resp.json();
  const base64 = data.artifacts[0].base64;

  return {
    url: `data:image/png;base64,${base64}`,
    provider: "stability",
  };
}

// ── Replicate ─────────────────────────────────────────────────────

async function generateWithReplicate(prompt: string): Promise<ImageGenResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN not set");

  // Default to Flux Schnell (fast, good quality)
  const model = process.env.REPLICATE_IMAGE_MODEL ||
    "black-forest-labs/flux-schnell";

  const resp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      model,
      input: { prompt },
    }),
  });

  if (!resp.ok) throw new Error(`Replicate error: ${resp.status}`);

  let prediction = await resp.json();

  // Poll until complete (Replicate is async)
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch(prediction.urls.get, {
      headers: { authorization: `Token ${token}` },
    });
    prediction = await poll.json();
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  const output = prediction.output;
  const url = Array.isArray(output) ? output[0] : output;

  return { url, provider: "replicate" };
}
