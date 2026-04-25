/**
 * @packageDocumentation
 * Tunables for SEP fetching. Override via environment in production.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function getSepCandidateMax(): number {
  return intEnv("SEP_CANDIDATE_MAX", 120)
}

export function getSepMaxSlugs(): number {
  return intEnv("SEP_MAX_SLUGS", 4)
}

export function getSepEntryMaxChars(): number {
  return intEnv("SEP_ENTRY_MAX_CHARS", 32_000)
}

/** Max prior turns (user+assistant pairs count as 2) sent to the model / retriever. */
export function getChatHistoryMaxTurns(): number {
  return intEnv("CHAT_HISTORY_MAX_TURNS", 40)
}

/** Max array length for request body history (reject above this). */
export function getChatHistoryMaxItems(): number {
  return intEnv("CHAT_HISTORY_MAX_ITEMS", 100)
}

/** Max characters for PRIOR_CONVERSATION transcript (older text dropped first). */
export function getChatHistoryMaxChars(): number {
  return intEnv("CHAT_HISTORY_MAX_CHARS", 24_000)
}

/** Max characters for SEP retrieval query (suffix keeps latest user message). */
export function getChatRetrievalQueryMaxChars(): number {
  return intEnv("CHAT_RETRIEVAL_QUERY_MAX_CHARS", 8000)
}
