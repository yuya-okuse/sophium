import { GoogleGenAI } from "@google/genai"
import { NextResponse } from "next/server"

import { runPhilosophyPipeline } from "@/lib/philosophy-pipeline"

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

  const message = (body as { message: string }).message.trim()
  if (!message) {
    return NextResponse.json({ error: "Message must not be empty." }, { status: 400 })
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"

  try {
    const ai = new GoogleGenAI({ apiKey })
    const result = await runPhilosophyPipeline(ai, model, message)

    return NextResponse.json({
      reply: result.reply,
      citations: result.citations,
      reviewVerdict: result.reviewVerdict,
      usedRetry: result.usedRetry,
    })
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : "Unexpected error running the pipeline."
    return NextResponse.json({ error: messageText }, { status: 502 })
  }
}
