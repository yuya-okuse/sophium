import type { GoogleGenAI } from "@google/genai"

import { generateJson } from "@/lib/gemini"
import type { EvidencePack, EvidenceItem } from "@/lib/agents/types"
import { getEntryPlainText } from "@/lib/sep/entryText"
import {
  getSepCandidateMax,
  getSepEntryMaxChars,
  getSepMaxSlugs,
} from "@/lib/sep/config"
import type { SepIndexEntry } from "@/lib/sep/parseContents"
import { shortlistEntries } from "@/lib/sep/shortlist"

const retrieverJsonSchema = {
  type: "object",
  properties: {
    slugs: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
  },
  required: ["slugs"],
  additionalProperties: false,
} as const

function indexBySlug(
  all: SepIndexEntry[]
): Map<string, SepIndexEntry> {
  return new Map(all.map((e) => [e.slug, e]))
}

/**
 * 1) Shortlist the SEP index, 2) ask Gemini to pick slugs, 3) fetch entry text.
 */
export async function buildEvidencePack(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string,
  allEntries: SepIndexEntry[]
): Promise<EvidencePack> {
  const maxSlugs = getSepMaxSlugs()
  const candidateN = getSepCandidateMax()
  const maxChars = getSepEntryMaxChars()

  const shortlist = shortlistEntries(
    userQuestion,
    allEntries,
    candidateN
  )
  const bySlug = indexBySlug(allEntries)

  const shortlistText = shortlist
    .map((e) => `${e.slug} — ${e.title}`)
    .join("\n")

  const { slugs } = await generateJson<{ slugs: string[] }>(ai, model, {
    system: `You are an indexer for the Stanford Encyclopedia of Philosophy (SEP).
The user will ask a philosophical question. From the CANDIDATE LINES below, pick up to ${maxSlugs} SEP entry slugs that are most likely to contain material relevant to answering the question.
Rules:
- You MUST only output slugs that appear verbatim in the candidate list (the part before " — ").
- Prefer a small, focused set over many loosely related entries.
- Output must follow the JSON schema exactly.`,
    user: `USER_QUESTION:
${userQuestion}

CANDIDATE_LINES (format: slug — title):
${shortlistText}
`,
    schema: retrieverJsonSchema,
    temperature: 0.1,
  })

  const requested = (slugs ?? [])
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)

  const resolved: string[] = []
  for (const r of requested) {
    if (bySlug.has(r) && !resolved.includes(r)) {
      resolved.push(r)
    }
  }
  if (resolved.length === 0 && shortlist[0]) {
    resolved.push(shortlist[0].slug)
  }
  if (resolved.length === 0) {
    throw new Error("The retriever did not return any valid SEP slugs.")
  }

  const unique = resolved.slice(0, maxSlugs)

  const items: EvidenceItem[] = []
  for (const slug of unique) {
    const meta = bySlug.get(slug)
    const title = meta?.title ?? slug
    const url = meta?.url ?? `https://plato.stanford.edu/entries/${slug}/`
    const textExcerpt = await getEntryPlainText(slug, maxChars)
    items.push({ slug, title, url, textExcerpt })
  }
  return { items }
}
