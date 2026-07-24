// Bring-your-own-key Groq client for a rough "is this claimed study time
// plausible?" check. The key is the USER'S own, entered in Options and stored
// only in chrome.storage.local (never in source, never sent anywhere but Groq).
// All access is guarded so pages still render outside an extension context.

import type { EntryPlausibility } from "../types";

const api = typeof chrome !== "undefined" ? chrome : undefined;

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_ORIGIN = "https://api.groq.com/*";
export const DEFAULT_MODEL = "openai/gpt-oss-20b";
export const MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"] as const;

export const groqSupported = Boolean(api?.storage?.local);

export type GroqSettings = { enabled: boolean; apiKey: string; model: string };
const DEFAULTS: GroqSettings = { enabled: false, apiKey: "", model: DEFAULT_MODEL };

export async function getGroqSettings(): Promise<GroqSettings> {
  if (!api?.storage?.local) return DEFAULTS;
  const s = await api.storage.local.get(["groqEnabled", "groqApiKey", "groqModel"]);
  return {
    enabled: Boolean(s.groqEnabled),
    apiKey: typeof s.groqApiKey === "string" ? s.groqApiKey : "",
    model: typeof s.groqModel === "string" && s.groqModel ? s.groqModel : DEFAULT_MODEL,
  };
}

export async function setGroqSettings(settings: GroqSettings): Promise<void> {
  await api?.storage?.local?.set({
    groqEnabled: settings.enabled,
    groqApiKey: settings.apiKey,
    groqModel: settings.model,
  });
}

export function hasGroqPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!api?.permissions?.contains) return resolve(false);
    api.permissions.contains({ origins: [GROQ_ORIGIN] }, (has) => resolve(Boolean(has)));
  });
}

export function requestGroqPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!api?.permissions?.request) return resolve(false);
    api.permissions.request({ origins: [GROQ_ORIGIN] }, (granted) => resolve(Boolean(granted)));
  });
}

const SYSTEM_PROMPT = `You estimate whether a claimed study time is plausible for a piece of learning content.
You cannot open links. Judge from the URL/domain, the user's title/note, and general knowledge.
Infer the content type from the domain (youtube/vimeo=video, blogs/docs/arxiv=article/paper, course domains=lesson)
and estimate a reasonable time RANGE in minutes for an average learner. Compare the claimed minutes to that range.
Be rough and state your key assumption in "reason" (one sentence).
verdict rules: "too_short" if claimed is well below your range, "too_long" if well above, otherwise "on_track".`;

const SCHEMA = {
  name: "plausibility",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "estimated_min", "estimated_max", "reason"],
    properties: {
      verdict: { type: "string", enum: ["on_track", "too_short", "too_long"] },
      estimated_min: { type: "integer" },
      estimated_max: { type: "integer" },
      reason: { type: "string" },
    },
  },
};

function isValid(v: unknown): v is EntryPlausibility {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.verdict === "on_track" || o.verdict === "too_short" || o.verdict === "too_long") &&
    typeof o.estimated_min === "number" &&
    typeof o.estimated_max === "number" &&
    typeof o.reason === "string"
  );
}

/**
 * Returns a plausibility verdict, or null on any failure (no key, bad key,
 * rate limit, network/timeout, malformed response). Never throws — the caller
 * treats the verdict as best-effort advisory metadata.
 */
export async function judgePlausibility(
  input: { url: string | null; note: string; minutes: number },
  settings: GroqSettings,
): Promise<EntryPlausibility | null> {
  if (!settings.enabled || !settings.apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model || DEFAULT_MODEL,
        temperature: 0,
        max_tokens: 200,
        stream: false,
        response_format: { type: "json_schema", json_schema: SCHEMA },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `URL: ${input.url || "none"}\nTitle/note: ${input.note || "none"}\nClaimed minutes: ${input.minutes}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const parsed = JSON.parse(content);
    return isValid(parsed)
      ? {
          verdict: parsed.verdict,
          estimated_min: Math.round(parsed.estimated_min),
          estimated_max: Math.round(parsed.estimated_max),
          reason: parsed.reason,
        }
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
