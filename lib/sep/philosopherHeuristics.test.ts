import { describe, expect, it } from "vitest"

import { filterToLikelyPersonEntries, scoreEntryAsLikelyPersonIndex } from "./philosopherHeuristics"
import { parseContentsHtml } from "./parseContents"
import type { PhilosopherOverrides } from "./philosopherHeuristics"

const emptyOverrides: PhilosopherOverrides = { include: [], exclude: [] }

describe("parseContentsHtml + philosopher heuristics", () => {
  it("parses entries and flags likely person index rows", () => {
    const html = `<!DOCTYPE html><html><body>
<ul>
<li><a href="entries/abduction/">abduction</a></li>
<li><a href="entries/aristotle/"><b>Aristotle</b></a></li>
<li><a href="entries/kant/">Kant, Immanuel</a></li>
</ul>
</body></html>`
    const all = parseContentsHtml(html)
    expect(all.map((e) => e.slug).sort()).toEqual([
      "abduction",
      "aristotle",
      "kant",
    ])
    const people = filterToLikelyPersonEntries(all, emptyOverrides)
    const slugs = new Set(people.map((p) => p.slug))
    expect(slugs.has("abduction")).toBe(false)
    expect(slugs.has("aristotle")).toBe(true)
    expect(slugs.has("kant")).toBe(true)
  })

  it("honors manual include and exclude", () => {
    const html = `<html><a href="entries/plato/"><b>Plato</b></a></html>`
    const all = parseContentsHtml(html)
    const noPlato = filterToLikelyPersonEntries(all, {
      include: ["plato", "nonexistent"],
      exclude: ["plato"],
    })
    expect(noPlato.length).toBe(0)
    const forceInclude = filterToLikelyPersonEntries(
      [
        { slug: "gamma", title: "Gamma", url: "https://example/entries/gamma/" },
        { slug: "delta", title: "Deltason", url: "https://example/entries/delta/" },
      ],
      { include: ["gamma"], exclude: [] }
    )
    expect(forceInclude.some((e) => e.slug === "gamma")).toBe(true)
  })

  it("scores single-word names and rejects lower-case lead titles", () => {
    expect(
      scoreEntryAsLikelyPersonIndex({
        slug: "aristotle",
        title: "Aristotle",
        url: "u",
      })
    ).toBeGreaterThanOrEqual(4)
    expect(
      scoreEntryAsLikelyPersonIndex({
        slug: "apriori",
        title: "a priori",
        url: "u",
      })
    ).toBe(0)
  })
})
