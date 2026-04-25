import { GoogleGenAI } from "@google/genai"
import { NextResponse } from "next/server"

import { runPhilosophyPipeline } from "@/lib/philosophy-pipeline"
import { parseChatLocale } from "@/lib/locale"
import { SlugNotInIndexError } from "@/lib/sep/philosophyRequestErrors"

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof (body as { message: unknown }).message !== "string"
  ) {
    return NextResponse.json(
      { error: "Expected JSON object with a string \"message\" field." },
      { status: 400 }
    )
  }

  const b = body as {
    message: string
    philosopherSlug?: unknown
    locale?: unknown
  }
  const message = b.message.trim()
  if (!message) {
    return NextResponse.json({ error: "Message must not be empty." }, { status: 400 })
  }
  if (
    "philosopherSlug" in b &&
    b.philosopherSlug !== null &&
    b.philosopherSlug !== undefined &&
    typeof b.philosopherSlug !== "string"
  ) {
    return NextResponse.json(
      { error: "If present, \"philosopherSlug\" must be a string." },
      { status: 400 }
    )
  }
  if (
    "locale" in b &&
    b.locale !== null &&
    b.locale !== undefined &&
    b.locale !== "en" &&
    b.locale !== "ja"
  ) {
    return NextResponse.json(
      { error: "If present, \"locale\" must be \"en\" or \"ja\"." },
      { status: 400 }
    )
  }
  const philosopherSlug = (
    typeof b.philosopherSlug === "string" ? b.philosopherSlug : ""
  ).trim()
  const acceptLanguage = request.headers.get("accept-language")
  const locale = parseChatLocale(
    b.locale,
    acceptLanguage
  )

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"

  try {
    const ai = new GoogleGenAI({ apiKey })
    const result = await runPhilosophyPipeline(ai, model, message, {
      philosopherSlug: philosopherSlug || undefined,
      locale,
    })

    return NextResponse.json({
      reply: result.reply,
      citations: result.citations,
      reviewVerdict: result.reviewVerdict,
      usedRetry: result.usedRetry,
    })
  } catch (err) {
    if (err instanceof SlugNotInIndexError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    const messageText =
      err instanceof Error ? err.message : "Unexpected error running the pipeline."
    return NextResponse.json({ error: messageText }, { status: 502 })
  }
}
