import type { GoogleGenAI } from "@google/genai"

/** When the primary model is UNAVAILABLE / high demand, retry once (e.g. different pool than gemini-2.5-flash). */
const GEMINI_FALLBACK_MODEL_ID = "gemini-2.5-flash-lite"

function getFallbackModelId(primary: string): string | null {
  if (GEMINI_FALLBACK_MODEL_ID === primary) return null
  return GEMINI_FALLBACK_MODEL_ID
}

function errorDiagnosticString(err: unknown): string {
  if (err instanceof Error) {
    const chunks: string[] = [err.message]
    const rec = err as { status?: unknown; cause?: unknown }
    if (typeof rec.status === "string") chunks.push(rec.status)
    const { cause } = rec
    if (cause instanceof Error) chunks.push(cause.message)
    else if (cause !== undefined && cause !== null && typeof cause !== "object") {
      chunks.push(String(cause))
    }
    return chunks.join(" ")
  }
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message
  }
  return String(err)
}

/** Exported for tests. */
export function shouldRetryWithFallback(err: unknown): boolean {
  const s = errorDiagnosticString(err).toLowerCase()
  return s.includes("unavailable") || s.includes("high demand")
}

type GeminiContentConfig = {
  systemInstruction?: string
  temperature: number
  maxOutputTokens?: number
  responseMimeType?: string
  responseJsonSchema?: unknown
}

async function generateContentText(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  config: GeminiContentConfig
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  })
  return response.text?.trim() ?? ""
}

async function runWithModelFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  contents: string,
  config: GeminiContentConfig,
  emptyResultMessage: string
): Promise<string> {
  try {
    const text = await generateContentText(ai, primaryModel, contents, config)
    if (!text) throw new Error(emptyResultMessage)
    return text
  } catch (err) {
    const fb = getFallbackModelId(primaryModel)
    if (!fb || !shouldRetryWithFallback(err)) throw err
    const text = await generateContentText(ai, fb, contents, config)
    if (!text) throw new Error(emptyResultMessage)
    return text
  }
}

type GenerateTextInput = {
  system?: string
  user: string
  temperature?: number
  maxOutputTokens?: number
}

/**
 * One-shot text generation with an optional system instruction.
 */
export async function generateText(
  ai: GoogleGenAI,
  model: string,
  { system, user, temperature = 0.4, maxOutputTokens }: GenerateTextInput
): Promise<string> {
  const config: GeminiContentConfig = {
    systemInstruction: system,
    temperature,
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
  }
  return runWithModelFallback(ai, model, user, config, "The model returned no text.")
}

type GenerateJsonInput = {
  system: string
  user: string
  schema: unknown
  temperature?: number
  maxOutputTokens?: number
}

/**
 * JSON mode via responseJsonSchema (Gemini API).
 */
export async function generateJson<T>(
  ai: GoogleGenAI,
  model: string,
  { system, user, schema, temperature = 0.2, maxOutputTokens }: GenerateJsonInput
): Promise<T> {
  const config: GeminiContentConfig = {
    systemInstruction: system,
    responseMimeType: "application/json",
    responseJsonSchema: schema,
    temperature,
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
  }
  const text = await runWithModelFallback(
    ai,
    model,
    user,
    config,
    "The model returned no JSON."
  )
  return JSON.parse(text) as T
}
