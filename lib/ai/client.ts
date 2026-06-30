/**
 * Gemini client wrapper — SERVER-SIDE ONLY.
 *
 * The API key (GEMINI_API_KEY) is read from the server environment and must never be
 * exposed to the browser. All AI calls funnel through here so the rest of the codebase
 * stays decoupled from the SDK and so every call has a graceful "AI unavailable" path:
 * helpers return null on missing key / error, and callers fall back to deterministic
 * templates (lib/ai/explain) or the keyword parser (lib/ai/parse).
 */

import { GoogleGenAI, type Schema } from "@google/genai";

/** Default model — fast + cheap, meets the 5–10s PRD latency target. Override via env. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

let cached: GoogleGenAI | null = null;

/** True when a Gemini API key is configured. Lets callers choose the AI vs fallback path. */
export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Lazily construct (and cache) the client. Returns null when no key is configured. */
export function getGeminiClient(): GoogleGenAI | null {
  if (!isAiEnabled()) return null;
  if (!cached) cached = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return cached;
}

/**
 * Generate plain text. Returns null on missing key, empty response, or any SDK error so
 * the caller can fall back deterministically.
 */
export async function generateText(
  prompt: string,
  systemInstruction?: string,
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;
  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    const text = res.text?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}

/**
 * Generate a JSON object validated against `schema`. Returns the parsed object, or null on
 * missing key / invalid JSON / SDK error. Generic <T> is the expected shape (caller still
 * validates semantics).
 */
export async function generateJson<T>(
  prompt: string,
  schema: Schema,
  systemInstruction?: string,
): Promise<T | null> {
  const ai = getGeminiClient();
  if (!ai) return null;
  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    const text = res.text?.trim();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
