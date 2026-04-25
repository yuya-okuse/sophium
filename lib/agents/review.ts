import type { GoogleGenAI } from "@google/genai"

import { generateJson } from "@/lib/gemini"
import type { EvidencePack, ReviewResult } from "@/lib/agents/types"
import type { ChatLocale } from "@/lib/locale"

const reviewJsonSchema = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["pass", "fail"] },
    factualIssues: {
      type: "array",
      items: { type: "string" },
    },
    groundingIssues: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["verdict", "factualIssues", "groundingIssues"],
  additionalProperties: false,
} as const

function formatEvidence(pack: EvidencePack): string {
  return pack.items
    .map(
      (it, i) =>
        `### ${i + 1}. ${it.title} (${it.url})
${it.textExcerpt}
`
    )
    .join("\n")
}

export type RunReviewOptions = {
  locale?: ChatLocale
}

export async function runReviewAgent(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string,
  pack: EvidencePack,
  draftAnswer: string,
  options?: RunReviewOptions
): Promise<ReviewResult> {
  const lang: ChatLocale = options?.locale ?? "ja"
  const ev = formatEvidence(pack)
  const system =
    lang === "en"
      ? `You are a strict fact-checker for a philosophy Q&A app.
The only philosophical source you may treat as evidence is the SEP_EVIDENCE text (fetched from plato.stanford.edu). The draft answer must not introduce claims that contradict that evidence, and must not invent citations or mis-attribute views.

Primary goal: block incorrect or unsupported philosophy content.
Secondary goal: check that the draft really reasons from the thinkers/entries in SEP_EVIDENCE (not generic chat).

If you are uncertain, set verdict to "fail" and explain the uncertainty in groundingIssues.
Write all strings in factualIssues and groundingIssues in English.`
      : `You are a strict fact-checker for a philosophy Q&A app.
The only philosophical source you may treat as evidence is the SEP_EVIDENCE text (fetched from plato.stanford.edu). The draft answer must not introduce claims that contradict that evidence, and must not invent citations or mis-attribute views.

Primary goal: block incorrect or unsupported philosophy content.
Secondary goal: check that the draft really reasons from the thinkers/entries in SEP_EVIDENCE (not generic chat).

If you are uncertain, set verdict to "fail" and explain the uncertainty in groundingIssues.
Write all strings in factualIssues and groundingIssues in Japanese.`
  const raw = await generateJson<{
    verdict: "pass" | "fail"
    factualIssues: string[]
    groundingIssues: string[]
  }>(ai, model, {
    system,
    user: `USER_QUESTION:
${userQuestion}

SEP_EVIDENCE:
${ev}

DRAFT_ANSWER:
${draftAnswer}
`,
    schema: reviewJsonSchema,
    temperature: 0.1,
    maxOutputTokens: 4096,
  })

  const verdict: ReviewResult["verdict"] =
    raw.verdict === "pass" ? "pass" : "fail"

  return {
    verdict,
    factualIssues: raw.factualIssues ?? [],
    groundingIssues: raw.groundingIssues ?? [],
  }
}
