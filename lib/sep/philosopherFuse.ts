import Fuse from "fuse.js"

import type { SepPhilosophersFile } from "@/lib/sep/philosophersList"

export type PhilosopherSearchRow = {
  slug: string
  title: string
  titleJa: string
}

/** Max rows returned for non-empty fuzzy search (full index is still searched). */
const DEFAULT_FUZZY_MAX = 80

export function philosopherRowsFromItems(
  items: SepPhilosophersFile["items"]
): PhilosopherSearchRow[] {
  return items.map((e) => ({
    slug: e.slug,
    title: e.title,
    titleJa: e.titleJa ?? "",
  }))
}

export function createPhilosopherFuse(
  rows: PhilosopherSearchRow[]
): Fuse<PhilosopherSearchRow> {
  return new Fuse(rows, {
    keys: [
      { name: "slug", weight: 0.28 },
      { name: "title", weight: 0.45 },
      { name: "titleJa", weight: 0.45 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 1,
  })
}

/**
 * Returns slug list for the combobox (no empty slug; caller prepends "none").
 * When `query` is empty, returns every slug in `rows` order (full list for scrolling).
 * When non-empty, returns fuzzy-ranked slugs capped at `fuzzyMaxResults`.
 */
export function searchPhilosopherSlugs(
  fuse: Fuse<PhilosopherSearchRow>,
  rows: PhilosopherSearchRow[],
  query: string,
  fuzzyMaxResults: number = DEFAULT_FUZZY_MAX
): string[] {
  const q = query.trim()
  if (!q) {
    return rows.map((r) => r.slug)
  }
  return fuse.search(q, { limit: fuzzyMaxResults }).map((h) => h.item.slug)
}

export function defaultPhilosopherFuzzyCap(): number {
  return DEFAULT_FUZZY_MAX
}
