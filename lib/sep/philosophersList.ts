import type { SepIndexEntry } from "./parseContents"
import type { PhilosopherOverrides } from "./philosopherHeuristics"

/** Shape of `data/sep-philosophers.json` (generated + committed). */
export type SepPhilosophersFile = {
  generatedAt: string
  sourceUrl: string
  heuristicVersion: number
  /** Copied for traceability. */
  overrides: PhilosopherOverrides
  /**
   * Optional `titleJa` is merged from `data/sep-philosopher-titles.ja.json` at generate time.
   */
  items: Array<SepIndexEntry & { titleJa?: string }>
  disclaimer: string
}
