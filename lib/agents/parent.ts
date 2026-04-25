import type { GoogleGenAI } from "@google/genai"

import { generateText } from "@/lib/gemini"
import type { ReviewResult, EvidencePack } from "@/lib/agents/types"
import type { ChatLocale } from "@/lib/locale"

function formatCitations(pack: EvidencePack): string {
  return pack.items
    .map((it) => `- ${it.title} — ${it.url}`)
    .join("\n")
}

export type RunParentOptions = {
  locale?: ChatLocale
}

/**
 * Polishes a passing draft for end users, preserving citations.
 */
export async function runParentSynthesize(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string,
  pack: EvidencePack,
  approvedDraft: string,
  options?: RunParentOptions
): Promise<string> {
  const lang: ChatLocale = options?.locale ?? "ja"
  const cite = formatCitations(pack)
  const sectionTitle = lang === "en" ? "References (SEP)" : "参照（SEP）"
  const system =
    lang === "en"
      ? `You are the final editor. Produce a single, clear reply for the end user in English.
Keep philosophical substance identical to the approved draft; you may improve structure, headings, and signposting.
At the end, add a short section titled "${sectionTitle}" and list the entries below. Do not add new philosophical claims.
`
      : `You are the final editor. Produce a single, clear reply for the end user in Japanese.
Keep philosophical substance identical to the approved draft; you may improve structure, headings, and signposting.
At the end, add a short section titled "${sectionTitle}" and list the entries below. Do not add new philosophical claims.
`
  return generateText(ai, model, {
    system,
    user: `USER_QUESTION:
${userQuestion}

APPROVED_DRAFT:
${approvedDraft}

CITATION_LINES (include all in 参照):
${cite}
`,
    temperature: 0.25,
    maxOutputTokens: 8192,
  })
}

/**
 * If review still fails or evidence is too thin, return a safe, honest final message.
 */
export async function runParentSafe(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string,
  pack: EvidencePack,
  lastDraft: string,
  lastReview: ReviewResult,
  options?: RunParentOptions
): Promise<string> {
  const lang: ChatLocale = options?.locale ?? "ja"
  const issues = [
    ...lastReview.factualIssues,
    ...lastReview.groundingIssues,
  ].join("\n- ")

  const noDetail = lang === "en" ? "(no details)" : "（詳細なし）"
  const system =
    lang === "en"
      ? `You are the final editor. The review step could not pass the answer.
Write a short, helpful reply in English that: (1) does not state uncertain philosophy as fact, (2) summarizes what the SEP material below does support at a high level, (3) points out why automatic verification failed (in plain language, using the issue list), (4) still lists references (SEP) for the pages actually fetched.
Be humble and clear.`
      : `You are the final editor. The review step could not pass the answer.
Write a short, helpful reply in Japanese that: (1) does not state uncertain philosophy as fact, (2) summarizes what the SEP material below does support at a high level, (3) points out why automatic verification failed (in plain language, using the issue list), (4) still lists 参照 for the SEP pages actually fetched.
Be humble and clear.`

  return generateText(ai, model, {
    system,
    user: `USER_QUESTION:
${userQuestion}

REVIEW_FAIL_DETAILS:
- ${issues || noDetail}

LAST_DRAFT (do not copy uncritically):
${lastDraft}

EVIDENCE_SUMMARY (titles only, for ${lang === "en" ? "References" : "参照"}):
${formatCitations(pack)}
`,
    temperature: 0.2,
    maxOutputTokens: 4096,
  })
}
