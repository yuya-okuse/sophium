import type { GoogleGenAI } from "@google/genai"

import { runAnswerAgent } from "@/lib/agents/answer"
import { runParentSafe, runParentSynthesize } from "@/lib/agents/parent"
import { runReviewAgent } from "@/lib/agents/review"
import { buildEvidencePack } from "@/lib/agents/retriever"
import type { EvidencePack, PipelineResult } from "@/lib/agents/types"
import { getContentsHtml } from "@/lib/sep/contents"
import { parseContentsHtml } from "@/lib/sep/parseContents"

function formatReviewFeedback(r: {
  factualIssues: string[]
  groundingIssues: string[]
}): string {
  const lines = [...r.factualIssues, ...r.groundingIssues].filter(Boolean)
  return lines.map((l) => `- ${l}`).join("\n")
}

function citationsFromPack(pack: EvidencePack) {
  return pack.items.map((it) => ({
    title: it.title,
    url: it.url,
    slug: it.slug,
  }))
}

/**
 * SEP-only multi-step pipeline: evidence → answer → review → (optional retry) → parent.
 */
export async function runPhilosophyPipeline(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string
): Promise<PipelineResult> {
  const html = await getContentsHtml()
  const allEntries = parseContentsHtml(html)
  if (allEntries.length === 0) {
    throw new Error("Could not parse any SEP entries from contents.html.")
  }

  const pack = await buildEvidencePack(ai, model, userQuestion, allEntries)
  const citations = citationsFromPack(pack)

  let draft = await runAnswerAgent(ai, model, userQuestion, pack)
  let review = await runReviewAgent(ai, model, userQuestion, pack, draft)
  let usedRetry = false

  if (review.verdict === "fail") {
    usedRetry = true
    const feedback = formatReviewFeedback(review)
    draft = await runAnswerAgent(
      ai,
      model,
      userQuestion,
      pack,
      feedback
    )
    review = await runReviewAgent(ai, model, userQuestion, pack, draft)
  }

  if (review.verdict === "pass") {
    const reply = await runParentSynthesize(
      ai,
      model,
      userQuestion,
      pack,
      draft
    )
    return {
      reply,
      citations,
      reviewVerdict: "pass",
      usedRetry,
    }
  }

  const reply = await runParentSafe(
    ai,
    model,
    userQuestion,
    pack,
    draft,
    review
  )
  return {
    reply,
    citations,
    reviewVerdict: "fail",
    usedRetry,
  }
}
