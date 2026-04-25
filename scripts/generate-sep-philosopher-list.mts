/**
 * Fetches SEP contents.html, applies philosopher heuristics, writes data/sep-philosophers.json
 * Run: pnpm run generate:sep-philosophers
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import type { PhilosopherOverrides } from "../lib/sep/philosopherHeuristics"
import type { SepPhilosophersFile } from "../lib/sep/philosophersList"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const loadLib = async () => {
  const [{ SEP_CONTENTS_URL }, heur, { parseContentsHtml }] = await Promise.all([
    import(new URL("../lib/sep/constants.ts", import.meta.url).href) as Promise<
      typeof import("../lib/sep/constants")
    >,
    import(
      new URL("../lib/sep/philosopherHeuristics.ts", import.meta.url).href
    ) as Promise<typeof import("../lib/sep/philosopherHeuristics")>,
    import(new URL("../lib/sep/parseContents.ts", import.meta.url).href) as Promise<
      typeof import("../lib/sep/parseContents")
    >,
  ])
  return {
    SEP_CONTENTS_URL,
    filterToLikelyPersonEntries: heur.filterToLikelyPersonEntries,
    PHILOSOPHER_HEURISTIC_VERSION: heur.PHILOSOPHER_HEURISTIC_VERSION,
    parseContentsHtml,
  }
}

const DEFAULT_UA = "Sophium/0.1 (generate-sep-philosopher-list; +https://plato.stanford.edu/)"

function ua(): string {
  return process.env.SEP_USER_AGENT?.trim() || DEFAULT_UA
}

async function main(): Promise<void> {
  const {
    SEP_CONTENTS_URL,
    parseContentsHtml,
    filterToLikelyPersonEntries,
    PHILOSOPHER_HEURISTIC_VERSION,
  } = await loadLib()

  const res = await fetch(SEP_CONTENTS_URL, { headers: { "User-Agent": ua() } })
  if (!res.ok) {
    throw new Error(`GET ${SEP_CONTENTS_URL} failed: ${res.status} ${res.statusText}`)
  }
  const html = await res.text()
  const all = parseContentsHtml(html)

  const overridesPath = join(root, "data/sep-philosopher-overrides.json")
  const raw = await readFile(overridesPath, "utf-8")
  const overrides = JSON.parse(raw) as PhilosopherOverrides

  const items = filterToLikelyPersonEntries(all, {
    include: Array.isArray(overrides.include) ? overrides.include : [],
    exclude: Array.isArray(overrides.exclude) ? overrides.exclude : [],
    notes: typeof overrides.notes === "string" ? overrides.notes : undefined,
  })

  const jaMapPath = join(root, "data/sep-philosopher-titles.ja.json")
  const jaRaw = await readFile(jaMapPath, "utf-8")
  const jaMap = JSON.parse(jaRaw) as Record<string, string>
  const itemsWithJa = items.map((it) => {
    const titleJa = jaMap[it.slug]
    if (titleJa == null || String(titleJa).trim() === "") {
      return { ...it }
    }
    return { ...it, titleJa: String(titleJa).trim() }
  })

  const out: SepPhilosophersFile = {
    generatedAt: new Date().toISOString(),
    sourceUrl: SEP_CONTENTS_URL,
    heuristicVersion: PHILOSOPHER_HEURISTIC_VERSION,
    overrides: {
      include: overrides.include ?? [],
      exclude: overrides.exclude ?? [],
      notes: overrides.notes,
    },
    items: itemsWithJa,
    disclaimer:
      "Heuristic filter: not a perfect partition of “philosophers” vs. other SEP entries. Edit data/sep-philosopher-overrides.json and re-run this script to fix false positives/negatives.",
  }

  const outPath = join(root, "data/sep-philosophers.json")
  await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf-8")
  console.log(`Wrote ${items.length} entries to ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
