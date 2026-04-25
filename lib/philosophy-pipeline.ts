import type { GoogleGenAI } from "@google/genai"

import { runAnswerAgent } from "@/lib/agents/answer"
import { runParentSafe, runParentSynthesize } from "@/lib/agents/parent"
import { runReviewAgent } from "@/lib/agents/review"
import { buildEvidencePack } from "@/lib/agents/retriever"
import type { EvidencePack, PipelineResult } from "@/lib/agents/types"
import { getContentsHtml } from "@/lib/sep/contents"
import { SlugNotInIndexError } from "@/lib/sep/philosophyRequestErrors"
import { parseContentsHtml } from "@/lib/sep/parseContents"
import type { AnswerMode } from "@/lib/answerMode"
import { DEFAULT_ANSWER_MODE } from "@/lib/answerMode"
import {
  type ChatHistoryTurn,
  buildRetrievalQueryWithDefaults,
  formatTranscriptForPrompt,
  trimChatHistory,
} from "@/lib/chatHistory"
import type { ChatLocale } from "@/lib/locale"

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

function normalizeSlugParam(raw: string | undefined): string {
  if (!raw) return ""
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
}

export type RunPhilosophyPipelineOptions = {
  /**
   * Optional SEP `entries/<slug>/` to pin first in the evidence pack (e.g. a chosen “philosopher”).
   */
  philosopherSlug?: string
  /** Response language for answer, review, and final parent step. */
  locale?: ChatLocale
  /** easy: plainer scaffolding for non-specialists; hard: denser philosophical voice. Omitted defaults to hard. */
  answerMode?: AnswerMode
  /** Prior turns only (not including the current `userQuestion`). */
  history?: ChatHistoryTurn[]
}

/**
 * SEP-only multi-step pipeline: evidence → answer → review → (optional retry) → parent.
 */
export async function runPhilosophyPipeline(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string,
  options?: RunPhilosophyPipelineOptions
): Promise<PipelineResult> {
  const locale: ChatLocale = options?.locale ?? "ja"
  const answerMode: AnswerMode = options?.answerMode ?? DEFAULT_ANSWER_MODE
  const history = trimChatHistory(options?.history ?? [])
  const priorTranscript = formatTranscriptForPrompt(history)
  const retrievalQuery = buildRetrievalQueryWithDefaults(history, userQuestion)
  const html = await getContentsHtml()
  const allEntries = parseContentsHtml(html)
  if (allEntries.length === 0) {
    throw new Error("Could not parse any SEP entries from contents.html.")
  }

  const bySlug = new Set(allEntries.map((e) => e.slug))
  const forced = normalizeSlugParam(options?.philosopherSlug)
  if (options?.philosopherSlug && forced && !bySlug.has(forced)) {
    throw new SlugNotInIndexError(
      `Unknown SEP entry slug: "${options.philosopherSlug.trim()}".`
    )
  }

  const pack = await buildEvidencePack(
    ai,
    model,
    retrievalQuery,
    allEntries,
    forced ? { forcedSlugs: [forced] } : undefined
  )
  const citations = citationsFromPack(pack)

  const primarySlugs = forced ? [forced] : undefined

  let draft = await runAnswerAgent(
    ai,
    model,
    userQuestion,
    pack,
    undefined,
    { primarySlugs, locale, answerMode, priorConversationTranscript: priorTranscript }
  )
  let review = await runReviewAgent(ai, model, userQuestion, pack, draft, {
    locale,
    priorConversationTranscript: priorTranscript,
  })
  let usedRetry = false

  if (review.verdict === "fail") {
    usedRetry = true
    const feedback = formatReviewFeedback(review)
    draft = await runAnswerAgent(
      ai,
      model,
      userQuestion,
      pack,
      feedback,
      { primarySlugs, locale, answerMode, priorConversationTranscript: priorTranscript }
    )
    review = await runReviewAgent(ai, model, userQuestion, pack, draft, {
      locale,
      priorConversationTranscript: priorTranscript,
    })
  }

  if (review.verdict === "pass") {
    const reply = await runParentSynthesize(
      ai,
      model,
      userQuestion,
      pack,
      draft,
      { locale, answerMode, priorConversationTranscript: priorTranscript }
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
    review,
    { locale, answerMode, priorConversationTranscript: priorTranscript }
  )
  return {
    reply,
    citations,
    reviewVerdict: "fail",
    usedRetry,
  }
}
