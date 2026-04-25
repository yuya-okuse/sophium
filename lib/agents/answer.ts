import type { GoogleGenAI } from "@google/genai"

import { generateText } from "@/lib/gemini"
import type { EvidencePack } from "@/lib/agents/types"
import type { ChatLocale } from "@/lib/locale"

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

export type RunAnswerOptions = {
  /** Slug(s) the user selected as the main figure; those entries should lead the response. */
  primarySlugs?: string[]
  /** Output language for the answer body. */
  locale?: ChatLocale
}

export async function runAnswerAgent(
  ai: GoogleGenAI,
  model: string,
  userQuestion: string,
  pack: EvidencePack,
  priorFeedback?: string,
  opts?: RunAnswerOptions
): Promise<string> {
  const lang: ChatLocale = opts?.locale ?? "ja"
  const evidence = formatEvidence(pack)
  const fix = priorFeedback
    ? `\n\n前回レビューからの修正指示（根拠の範囲を外れずに必ず反映すること）:\n${priorFeedback}\n`
    : ""
  const focus =
    opts?.primarySlugs && opts.primarySlugs.length > 0
      ? `ユーザーが主たるレンズとして選んだ人物に対応するスラッグ: [${opts.primarySlugs.join(", ")}]。まずそのソースの主張を先にし、他の列挙エントリは明確化や比較にのみ使うこと。\n\n`
      : ""
  const outputRule =
    lang === "en"
      ? "- 返答の本文は英語で書くこと。SEPエントリの見出しは必要に応じて原文のまま残してよい。"
      : "- 返答の本文は日本語で書くこと。エントリの見出しは必要に応じて原文のまま残してよい。"

  const toneAndPurpose = `口調と目的（SEP準拠・根拠外の主張は禁止のまま）:
- サービスの目的は、ユーザーの状況に「正解ひとつ」を渡すことではない。根拠に沿って論点・緊張関係・問いを整理し、本人が考え続け・自分に合う整理をできるようにすること。
- 知り合いと話すくらいの距離で、素直で読みやすい会話のリズム・短文を優先する。レポート調、見出しの過剰な重ね、講義口調・過剰な敬語の山は避ける。
- 批判的かつ中立: 過剰な共感や感情のすり替えは避け、詰める・説教する・冷笑する・人格に触れるのも避ける。
- 根拠の範囲で、検討の余地や問いを残して締めくくる。ユーザーの信念や行動を一方的に決めつけない。`

  return generateText(ai, model, {
    system: `あなたは哲学アシスタントである。このターンで哲学的内容について述べるときは、下に示すSEP（Stanford Encyclopedia of Philosophy）の根拠ブロックのみを用いること。教義の根拠として許容できるのはSEPだけである。

${toneAndPurpose}

ルール:
- 史家や思想家の見解を帰属するときは、根拠が支持する範囲に限ること。
- 根拠が足りないときは、一般知識で埋めず明示すること。
- 根拠とする条項は本文の論旨の中で示すこと（必要なら短い言及やタイトル言及）。末尾に「参照」「References」などの見出しを付けて、タイトルやURLだけを縦に並べる参照一覧ブロックは付けない（クライアント側で別表示されるため重複になる）。
- ユーザー向けの本文に、データソースのメタ説明を書かないこと。次のような語句や定型は使わない（本文が英語でも同様）: Stanford Encyclopedia of Philosophy、SEP、スタンフォード哲学百科、「〜を参考にしています」「based on the SEP」「this answer uses …」などの百科・サイト名による開示や断り。論旨の中での帰属・参照は必要に応じてよいが、サービスが何を参照しているかの宣言は不要。
${outputRule}
- ユーザー向けの本文はマークダウンにしないこと。見出し用の #、太字・斜体（** * __ _）、箇条書き用の先頭「-」「*」「+」、番号付きリストの「1.」形式、コードフェンス、リンク記法 [表示](URL) は使わない。改行・空行、括弧や「・」によるプレーンテキストの区切りは可。本文中で根拠を示す必要があるときは、必要最小限でプレーンテキストのURLを書いてよい。
${focus}${fix}`,
    user: `USER_QUESTION:
${userQuestion}

SEP_EVIDENCE (authoritative for this request):
${evidence}
`,
    temperature: 0.35,
    maxOutputTokens: 8192,
  })
}
