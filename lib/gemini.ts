import type { GoogleGenAI } from "@google/genai"

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
  const response = await ai.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: system,
      temperature,
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    },
  })
  const text = response.text?.trim()
  if (!text) {
    throw new Error("The model returned no text.")
  }
  return text
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
  const response = await ai.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature,
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    },
  })
  const text = response.text?.trim()
  if (!text) {
    throw new Error("The model returned no JSON.")
  }
  return JSON.parse(text) as T
}
