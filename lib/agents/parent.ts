import type { GoogleGenAI } from "@google/genai"

import { generateText } from "@/lib/gemini"
import type { ReviewResult, EvidencePack } from "@/lib/agents/types"
import type { ChatLocale } from "@/lib/locale"

function formatCitations(pack: EvidencePack): string {
  return pack.items.map((it) => `${it.title} — ${it.url}`).join("\n")
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
  const outputLangLine =
    lang === "en"
      ? "返答の本文は英語で書くこと。"
      : "返答の本文は日本語で書くこと。"
  const system = `あなたは最終編集者。エンドユーザー向けに返答を1つにまとめる。
${outputLangLine}
承認済み下書きの哲学的な中身は変えず、必要なら段落の区切りと道しるべだけ整える。
口調: 下書きの趣旨どおり、ユーザーの思考を支えることに寄せる（「正解一式」の形式的な渡し方にしない）。批判的かつ中立で、知り合いと話す距離感・短文・会話のリズム。堅すぎず、媚びすぎず、説教口調にもしない。
ユーザー向けの文面に Stanford Encyclopedia of Philosophy、SEP、スタンフォード哲学百科、「〜を参照しています」「based on the SEP」などのソース名やメタ開示を書かない。下書きにあれば削除する。
末尾の参照一覧は出力しない。「参照」「References」などの見出しの直後に、タイトルとURL、またはタイトルだけを行で並べるブロックを付けない・残さない（クライアントが同内容を別UIで出すため、本文に重ねると二重になる）。下書きにそのようなブロックがあれば削除する。USED_SOURCES は編集判断用であり、ユーザー向けの最終文にそのまま貼り付けない。
出力はマークダウン禁止（# 見出し、**太字**、先頭「-」の箇条書き、コードフェンス、[表示](URL) 記法などは使わない）。下書きにマークダウンがあればプレーンテキストに直す。新しい哲学的主張は足さない。
`
  return generateText(ai, model, {
    system,
    user: `USER_QUESTION:
${userQuestion}

APPROVED_DRAFT:
${approvedDraft}

USED_SOURCES (internal; do not append as a list to the user reply):
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
  const safeOutputLang =
    lang === "en"
      ? "返答の本文は英語で書くこと。"
      : "返答の本文は日本語で書くこと。"
  const system = `あなたは最終編集者。レビューが通らなかった。
${safeOutputLang}
次を満たす短い返答にすること: (1) 不確かな哲学を事実のように言わない、(2) 下の参照条項で実際に支えられる範囲を大まかに整理、(3) 自動検証が落ちた理由を平易に（issue リストを使う）、(4) 必要なら1件につき1行程度で、参照のタイトルとURLをプレーンテキストで簡潔に示す（見出し「参照」を二重に付けたり、同じ一覧を内容の違う二段で繰り返さない）。
口調: 本番と同じ軸で、ユーザーの思考を支えつつ人生の正解を一つに決めつけない。批判的かつ中立、知り合いと話す距離感（堅すぎず媚びず詰めすぎない）。限界は率直に。人格攻撃はしない。カジュアルすぎず、過剰に丁寧すぎないバランス。
ユーザー向けの文面に Stanford Encyclopedia of Philosophy、SEP、スタンフォード哲学百科、参照先百科の名指しや「〜を参照しています」などのメタ開示を書かない。
出力はマークダウン禁止（#、**、箇条書き用の先頭「-」、コードフェンス、リンク記法などは使わない）。末尾に「参照」だけを二回並べるような体裁にしない。`

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
