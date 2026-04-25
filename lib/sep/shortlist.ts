import type { SepIndexEntry } from "./parseContents"

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "has",
  "have",
  "not",
  "but",
  "what",
  "how",
  "why",
  "can",
  "does",
  "its",
  "their",
  "any",
  "some",
  "you",
  "your",
])

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t))
}

/**
 * Heuristic relevance filter so we do not send the entire SEP index to Gemini.
 */
export function shortlistEntries(
  question: string,
  entries: SepIndexEntry[],
  max: number
): SepIndexEntry[] {
  const n = Math.max(1, max)
  if (entries.length <= n) return entries

  const terms = tokenize(question)
  if (terms.length === 0) {
    return entries.slice(0, n)
  }

  const scored = entries.map((e) => {
    const titleLower = e.title.toLowerCase()
    const slugSpaces = e.slug.toLowerCase().replace(/-/g, " ")
    let score = 0
    for (const term of terms) {
      if (titleLower.includes(term)) score += 3
      if (slugSpaces.includes(term)) score += 2
      if (e.slug.includes(term)) score += 1
    }
    return { entry: e, score }
  })

  scored.sort(
    (a, b) =>
      b.score - a.score || a.entry.title.localeCompare(b.entry.title)
  )

  const withHits = scored.filter((x) => x.score > 0)
  if (withHits.length === 0) {
    return entries.slice(0, n)
  }
  return withHits.map((x) => x.entry).slice(0, n)
}
