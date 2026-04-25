import {
  getChatHistoryMaxChars,
  getChatHistoryMaxItems,
  getChatHistoryMaxTurns,
  getChatRetrievalQueryMaxChars,
} from "./sep/config"

export type ChatHistoryTurn = {
  role: "user" | "assistant"
  content: string
}

function isChatRole(v: unknown): v is ChatHistoryTurn["role"] {
  return v === "user" || v === "assistant"
}

/**
 * Strict parse: every element must be `{ role, content }` with non-empty content.
 * Returns an error message for HTTP 400, or the normalized array.
 */
export function parseChatHistoryField(
  raw: unknown
): { ok: true; history: ChatHistoryTurn[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, history: [] }
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "If present, \"history\" must be an array." }
  }
  const maxItems = getChatHistoryMaxItems()
  if (raw.length > maxItems) {
    return {
      ok: false,
      error: `History must have at most ${maxItems} entries.`,
    }
  }
  const out: ChatHistoryTurn[] = []
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (typeof item !== "object" || item === null) {
      return {
        ok: false,
        error: `Invalid history entry at index ${i}: expected an object.`,
      }
    }
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if (!isChatRole(role)) {
      return {
        ok: false,
        error: `Invalid history entry at index ${i}: \"role\" must be \"user\" or \"assistant\".`,
      }
    }
    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false,
        error: `Invalid history entry at index ${i}: \"content\" must be a non-empty string.`,
      }
    }
    out.push({ role, content: content.trim() })
  }
  return { ok: true, history: out }
}

function trimTurnsToMaxTurns(turns: ChatHistoryTurn[], maxTurns: number): ChatHistoryTurn[] {
  if (turns.length <= maxTurns) return turns
  return turns.slice(turns.length - maxTurns)
}

/** Oldest-first turns whose joined transcript fits within maxChars (prefers keeping newest). */
function trimTurnsByCharBudget(
  turnsOldestFirst: ChatHistoryTurn[],
  maxChars: number,
  formatTurn: (t: ChatHistoryTurn) => string
): ChatHistoryTurn[] {
  const selected: ChatHistoryTurn[] = []
  let used = 0
  for (let i = turnsOldestFirst.length - 1; i >= 0; i--) {
    const t = turnsOldestFirst[i]!
    const block = formatTurn(t)
    const add = block.length + (selected.length > 0 ? 2 : 0)
    if (used + add > maxChars) {
      if (selected.length === 0) {
        const room = maxChars - 8
        if (room > 0) {
          selected.push({
            role: t.role,
            content: t.content.slice(Math.max(0, t.content.length - room)),
          })
        }
        used = maxChars
      }
      break
    }
    selected.push(t)
    used += add
  }
  return selected.reverse()
}

function formatTranscriptTurn(t: ChatHistoryTurn): string {
  const label = t.role === "user" ? "USER" : "ASSISTANT"
  return `[${label}]\n${t.content}`
}

/**
 * Prior turns only (no current message). Oldest first, bounded by config.
 */
export function trimChatHistory(turns: ChatHistoryTurn[]): ChatHistoryTurn[] {
  const maxTurns = getChatHistoryMaxTurns()
  const maxChars = getChatHistoryMaxChars()
  const capped = trimTurnsToMaxTurns(turns, maxTurns)
  return trimTurnsByCharBudget(capped, maxChars, formatTranscriptTurn)
}

/**
 * Plain-text block for prompts. Empty string if no history.
 */
export function formatTranscriptForPrompt(turns: ChatHistoryTurn[]): string {
  if (turns.length === 0) return ""
  return turns.map(formatTranscriptTurn).join("\n\n")
}

/**
 * Retrieval query: prior turns plus latest user message. The latest `user: …` line is kept
 * intact; older head text is truncated from the left when over maxChars.
 */
export function buildRetrievalQuery(
  turns: ChatHistoryTurn[],
  latestUserMessage: string,
  maxChars: number
): string {
  const latest = latestUserMessage.trim()
  const tail = `user: ${latest}`
  const headParts: string[] = []
  for (const t of turns) {
    headParts.push(`${t.role}: ${t.content}`)
  }
  let head = headParts.join("\n\n")
  const joiner = head ? "\n\n" : ""
  let combined = head ? `${head}${joiner}${tail}` : tail
  if (combined.length <= maxChars) return combined
  const maxHead = maxChars - tail.length - joiner.length
  if (maxHead <= 0) {
    return tail.length <= maxChars ? tail : tail.slice(-maxChars)
  }
  head = head.slice(head.length - maxHead)
  combined = head ? `${head}${joiner}${tail}` : tail
  return combined
}

export function buildRetrievalQueryWithDefaults(
  turns: ChatHistoryTurn[],
  latestUserMessage: string
): string {
  return buildRetrievalQuery(
    turns,
    latestUserMessage,
    getChatRetrievalQueryMaxChars()
  )
}
