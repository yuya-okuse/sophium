import { describe, expect, it } from "vitest"

import {
  buildRetrievalQuery,
  formatTranscriptForPrompt,
  parseChatHistoryField,
} from "./chatHistory"

describe("parseChatHistoryField", () => {
  it("accepts undefined as empty history", () => {
    expect(parseChatHistoryField(undefined)).toEqual({ ok: true, history: [] })
  })

  it("accepts valid alternating-style array", () => {
    const r = parseChatHistoryField([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ])
    expect(r).toEqual({
      ok: true,
      history: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi there" },
      ],
    })
  })

  it("rejects non-array", () => {
    const r = parseChatHistoryField("nope")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain("array")
  })

  it("rejects bad role", () => {
    const r = parseChatHistoryField([{ role: "system", content: "x" }])
    expect(r.ok).toBe(false)
  })

  it("rejects empty content", () => {
    const r = parseChatHistoryField([{ role: "user", content: "   " }])
    expect(r.ok).toBe(false)
  })
})

describe("buildRetrievalQuery", () => {
  it("ends with latest user message and preserves suffix when over maxChars", () => {
    const latest = "final question about Kant"
    const longPrior = "a".repeat(5000)
    const q = buildRetrievalQuery(
      [{ role: "user", content: longPrior }],
      latest,
      120
    )
    expect(q.endsWith(latest)).toBe(true)
    expect(q.length).toBeLessThanOrEqual(120)
  })

  it("joins prior turns with latest", () => {
    const q = buildRetrievalQuery(
      [{ role: "user", content: "first" }],
      "second",
      10_000
    )
    expect(q).toContain("user: first")
    expect(q).toContain("user: second")
  })
})

describe("formatTranscriptForPrompt", () => {
  it("formats roles and joins with blank line", () => {
    const s = formatTranscriptForPrompt([
      { role: "user", content: "Q" },
      { role: "assistant", content: "A" },
    ])
    expect(s).toContain("[USER]")
    expect(s).toContain("[ASSISTANT]")
    expect(s).toContain("Q")
    expect(s).toContain("A")
  })

  it("returns empty string for empty input", () => {
    expect(formatTranscriptForPrompt([])).toBe("")
  })
})
