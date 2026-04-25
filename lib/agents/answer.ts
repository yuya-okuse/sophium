import type { GoogleGenAI } from "@google/genai"

import { generateText } from "@/lib/gemini"
import type { EvidencePack } from "@/lib/agents/types"

function formatEvidence(pack: EvidencePack): string {
  return pack.items
    .map(
      (it, i) =>
        `### Source ${i + 1}: ${it.title}
URL: ${it.url}
Slug: ${it.slug}
Excerpt (plain text from SEP; may be truncated):
${it.textExcerpt}
`
    )
    .join("\n")
}

export async function runAnswerAgent(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string,
  pack: EvidencePack,
  priorFeedback?: string
): Promise<string> {
  const evidence = formatEvidence(pack)
  const fix = priorFeedback
    ? `\n\nPREVIOUS_REVIEW_FEEDBACK (you must fix these while staying within the evidence):\n${priorFeedback}\n`
    : ""
  return generateText(ai, model, {
    system: `You are a philosophy assistant. You ONLY use the SEP evidence blocks below to discuss philosophical ideas. The Stanford Encyclopedia of Philosophy (SEP) is the only acceptable source of doctrine in this turn.

Rules:
- Do not attribute views to historical figures unless the evidence supports it.
- If the evidence is insufficient, say so clearly instead of filling gaps from general world knowledge.
- Cite which SEP entry you rely on, using the provided titles and URLs.
- Write the main answer in Japanese, but keep entry titles in their original form when helpful.
- No markdown code fences unless you quote a short line from the evidence text.${fix}`,
    user: `USER_QUESTION:
${userQuestion}

SEP_EVIDENCE (authoritative for this request):
${evidence}
`,
    temperature: 0.35,
    maxOutputTokens: 8192,
  })
}
