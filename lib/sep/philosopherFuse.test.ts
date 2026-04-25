import { describe, expect, it } from "vitest"

import {
  createPhilosopherFuse,
  philosopherRowsFromItems,
  searchPhilosopherSlugs,
} from "./philosopherFuse"
import type { SepPhilosophersFile } from "./philosophersList"

const miniItems: SepPhilosophersFile["items"] = [
  {
    slug: "kant",
    title: "Immanuel Kant",
    titleJa: "イマヌエル・カント",
    url: "https://plato.stanford.edu/entries/kant/",
  },
  {
    slug: "kant-moral",
    title: "Kant’s Moral Philosophy",
    titleJa: "カントの道徳哲学",
    url: "https://plato.stanford.edu/entries/kant-moral/",
  },
  {
    slug: "plato",
    title: "Plato",
    titleJa: "プラトン",
    url: "https://plato.stanford.edu/entries/plato/",
  },
]

describe("philosopherFuse", () => {
  it("returns every slug when query is empty (ignores fuzzy cap)", () => {
    const rows = philosopherRowsFromItems(miniItems)
    const fuse = createPhilosopherFuse(rows)
    expect(searchPhilosopherSlugs(fuse, rows, "", 1)).toEqual([
      "kant",
      "kant-moral",
      "plato",
    ])
  })

  it("finds by Japanese title substring via fuzzy", () => {
    const rows = philosopherRowsFromItems(miniItems)
    const fuse = createPhilosopherFuse(rows)
    const hits = searchPhilosopherSlugs(fuse, rows, "プラトン", 5)
    expect(hits).toContain("plato")
  })

  it("finds by slug fragment", () => {
    const rows = philosopherRowsFromItems(miniItems)
    const fuse = createPhilosopherFuse(rows)
    const hits = searchPhilosopherSlugs(fuse, rows, "kant-moral", 5)
    expect(hits[0]).toBe("kant-moral")
  })
})
