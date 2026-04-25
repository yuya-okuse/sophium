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
