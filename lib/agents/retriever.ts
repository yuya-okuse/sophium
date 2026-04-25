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

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
}

export type BuildEvidencePackOptions = {
  /**
   * Always fetch these slugs first (e.g. user-chosen “philosopher” entry), then fill up to
   * `SEP_MAX_SLUGS` with the usual retriever, excluding duplicates.
   */
  forcedSlugs?: string[]
}

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
 * 1) Optional forced slugs, 2) shortlist + Gemini for remaining slots, 3) fetch entry text.
 * @param retrievalQuery Text used for shortlisting and slug selection (may include prior turns + latest user message).
 */
export async function buildEvidencePack(
  ai: GoogleGenAI,
  model: string,
  retrievalQuery: string,
  allEntries: SepIndexEntry[],
  options?: BuildEvidencePackOptions
): Promise<EvidencePack> {
  const maxSlugs = getSepMaxSlugs()
  const candidateN = getSepCandidateMax()
  const maxChars = getSepEntryMaxChars()

  const bySlug = indexBySlug(allEntries)
  const forcedIn = (options?.forcedSlugs ?? [])
    .map((s) => normalizeSlug(s))
    .filter(Boolean)

  const forcedOrdered: string[] = []
  for (const s of forcedIn) {
    if (bySlug.has(s) && !forcedOrdered.includes(s)) {
      forcedOrdered.push(s)
    }
  }
  if (forcedIn.length > 0 && forcedOrdered.length === 0) {
    throw new Error("No valid forced SEP slugs were found in the current index.")
  }

  const forcedCapped = forcedOrdered.slice(0, maxSlugs)
  const remainingSlots = Math.max(0, maxSlugs - forcedCapped.length)

  const resolved: string[] = []

  if (remainingSlots > 0) {
    let shortlist = shortlistEntries(
      retrievalQuery,
      allEntries,
      candidateN
    ).filter((e) => !forcedCapped.includes(e.slug))
    if (shortlist.length === 0) {
      shortlist = allEntries
        .filter((e) => !forcedCapped.includes(e.slug))
        .slice(0, candidateN)
    }
    const shortlistText = shortlist
      .map((e) => `${e.slug} — ${e.title}`)
      .join("\n")

    if (shortlistText.trim()) {
      const { slugs } = await generateJson<{ slugs: string[] }>(ai, model, {
        system: `You are an indexer for the Stanford Encyclopedia of Philosophy (SEP).
The user will ask a philosophical question. From the CANDIDATE LINES below, pick up to ${remainingSlots} SEP entry slugs that are most likely to help answer the question (in addition to any slugs the system will already add).
Rules:
- You MUST only output slugs that appear verbatim in the candidate list (the part before " — ").
- Pick at most ${remainingSlots} slugs.
- Prefer a small, focused set.
- Output must follow the JSON schema exactly.`,
        user: `USER_QUESTION:
${retrievalQuery}

CANDIDATE_LINES (format: slug — title):
${shortlistText}
`,
        schema: retrieverJsonSchema,
        temperature: 0.1,
      })

      const requested = (slugs ?? [])
        .map((s) => normalizeSlug(s))
        .filter(Boolean)
      for (const r of requested) {
        if (bySlug.has(r) && !forcedCapped.includes(r) && !resolved.includes(r)) {
          resolved.push(r)
          if (resolved.length >= remainingSlots) break
        }
      }
      if (resolved.length === 0 && shortlist[0] && !forcedCapped.includes(shortlist[0].slug)) {
        resolved.push(shortlist[0].slug)
      }
    }
  } else {
    // Only forced; no second-stage picks.
  }

  const seen = new Set<string>()
  const unique: string[] = []
  for (const s of [...forcedCapped, ...resolved]) {
    if (seen.has(s)) continue
    if (!bySlug.has(s)) continue
    seen.add(s)
    unique.push(s)
  }
  if (unique.length === 0) {
    throw new Error("The retriever did not return any valid SEP slugs.")
  }
  const finalSlugs = unique.slice(0, maxSlugs)

  const items: EvidenceItem[] = []
  for (const slug of finalSlugs) {
    const meta = bySlug.get(slug)
    const title = meta?.title ?? slug
    const url = meta?.url ?? `https://plato.stanford.edu/entries/${slug}/`
    const textExcerpt = await getEntryPlainText(slug, maxChars)
    items.push({ slug, title, url, textExcerpt })
  }
  return { items }
}
