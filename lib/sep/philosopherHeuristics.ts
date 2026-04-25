import type { SepIndexEntry } from "./parseContents"

/** Bump when the scoring rules change (stored in generated JSON). */
export const PHILOSOPHER_HEURISTIC_VERSION = 1

export type PhilosopherOverrides = {
  /** Slugs to force-include if they exist in the full index. */
  include: string[]
  /** Slugs to remove from heuristic matches. */
  exclude: string[]
  /** Free-form note for maintainers. */
  notes?: string
}

const TOPIC_SUBSTRINGS = [
  "philosophy of",
  "ethics of",
  "aesthetics of",
  " epistemology of",
  "arguments for",
  "theories of",
  "concept of",
  "problem of",
  " definition of",
  " vs ",
  " versus ",
  " and ",
  " in ",
  " in early",
  " in modern",
  "in the 18th",
  "feminist philosophy",
  "political philosophy",
] as const

/** Titles that still start with uppercase but read like a topic, not a person. */
const TOPIC_TITLE_PREFIX = /^(A|An|The)\s+(problem|nature|concept|idea|ethics|philosophy|question|value|theory|argument|defence|defense|use|role|status|value|view)\b/iu

/**
 * Heuristic: scores SEP index rows that may be biographical / about a single figure.
 * Not a perfect partition of “philosophers” vs “topics”; use overrides to fix edges.
 */
export function scoreEntryAsLikelyPersonIndex(e: SepIndexEntry): number {
  const t = e.title.trim()
  if (t.length < 2) return 0
  if (e.slug.length < 2) return 0

  let score = 0

  // Western-style "Surname, Given"
  if (/[,\uFF0C]\s*\p{L}/u.test(t) && t.length < 200) {
    if (!/see /i.test(t) && !/^see /i.test(t)) {
      score += 10
    }
  }

  const tNorm = t.toLowerCase()
  for (const s of TOPIC_SUBSTRINGS) {
    if (tNorm.includes(s)) {
      return 0
    }
  }

  if (TOPIC_TITLE_PREFIX.test(t)) {
    return 0
  }
  if (/^\p{Ll}/u.test(t)) {
    return 0
  }

  const wordCount = t.split(/\s+/).filter(Boolean).length
  if (wordCount >= 1 && wordCount <= 4) {
    score += 3
  }

  if (wordCount === 1 && t.length >= 3 && t.length < 50) {
    if (/^[\p{Lu}]/u.test(t)) {
      score += 5
    }
  } else if (wordCount === 2) {
    const [a, b] = t.split(/\s+/) as [string, string | undefined]
    if (b && /^[\p{Lu}]/u.test(a) && /^[\p{Lu}]/u.test(b)) {
      if (a.length < 2 || b.length < 2) {
        // skip
      } else {
        score += 4
      }
    }
  }

  // Penalize long titles (more often survey / topic)
  if (t.length > 80) {
    score -= 3
  }
  if (t.length > 120) {
    return 0
  }

  return Math.max(0, score)
}

/**
 * Merges heuristic pass with manual include/exclude against the full `allEntries` map.
 */
export function filterToLikelyPersonEntries(
  allEntries: SepIndexEntry[],
  overrides: PhilosopherOverrides
): SepIndexEntry[] {
  const bySlug = new Map(allEntries.map((e) => [e.slug, e] as const))
  const out = new Map<string, SepIndexEntry>()

  for (const e of allEntries) {
    if (overrides.exclude.includes(e.slug)) continue
    if (scoreEntryAsLikelyPersonIndex(e) < 4) continue
    out.set(e.slug, e)
  }

  for (const s of overrides.include) {
    const e = bySlug.get(s)
    if (e) {
      out.set(s, e)
    }
  }

  for (const s of overrides.exclude) {
    out.delete(s)
  }

  return Array.from(out.values()).sort((a, b) => a.title.localeCompare(b.title))
}
