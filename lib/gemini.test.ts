import { describe, expect, it } from "vitest"

import { shouldRetryWithFallback } from "./gemini"

describe("shouldRetryWithFallback", () => {
  it("returns true when message contains UNAVAILABLE", () => {
    expect(
      shouldRetryWithFallback(
        new Error(
          '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'
        )
      )
    ).toBe(true)
  })

  it("returns true for high demand phrase alone", () => {
    expect(
      shouldRetryWithFallback(new Error("This model is currently experiencing high demand."))
    ).toBe(true)
  })

  it("returns true when Error has status UNAVAILABLE", () => {
    const e = new Error("RPC failed")
    ;(e as Error & { status: string }).status = "UNAVAILABLE"
    expect(shouldRetryWithFallback(e)).toBe(true)
  })

  it("returns false for unrelated errors", () => {
    expect(shouldRetryWithFallback(new Error("Invalid API key"))).toBe(false)
  })
})
