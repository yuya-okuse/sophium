import type { GoogleGenAI } from "@google/genai"

import type { AnswerMode } from "@/lib/answerMode"
import { DEFAULT_ANSWER_MODE } from "@/lib/answerMode"
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

function toneAndPurpose(lang: ChatLocale, mode: AnswerMode): string {
  if (mode === "hard") {
    if (lang === "en") {
      return `Tone and purpose (SEP-grounded; do not assert beyond the evidence):
- The goal is not to hand the user a single "correct answer." From the evidence, organize issues, tensions, and open questions so they can keep thinking and find their own framing.
- Keep a friendly, readable conversational rhythm with short sentences. Avoid report tone, stacked headings, lecture voice, and piles of stiff honorifics.
- Critical yet neutral: avoid excessive empathy or emotional deflection; do not badger, preach, sneer, or attack the person.
- Concrete and abstract: Prefer concrete hooks that appear in SEP_EVIDENCE (examples, contrasts, setups attributed there). Move from those to the abstract claim and, when helpful, step once back to what the abstract term picks out—still within the same evidence. Do not invent named historical incidents or vivid "real life" facts the evidence does not mention; if examples are thin, prefer stating limits of evidence over filler anecdotes.
- Close by leaving room for further thought and questions within what the evidence supports. Do not dictate the user's beliefs or actions.`
    }
    return `口調と目的（SEP準拠・根拠外の主張は禁止のまま）:
- サービスの目的は、ユーザーの状況に「正解ひとつ」を渡すことではない。根拠に沿って論点・緊張関係・問いを整理し、本人が考え続け・自分に合う整理をできるようにすること。
- 知り合いと話すくらいの距離で、素直で読みやすい会話のリズム・短文を優先する。レポート調、見出しの過剰な重ね、講義口調・過剰な敬語の山は避ける。
- 批判的かつ中立: 過剰な共感や感情のすり替えは避け、詰める・説教する・冷笑する・人格に触れるのも避ける。
- 具体と抽象の往復: SEPの根拠に現れる事例・対比・典型の文脈を短く足がかりにし、そこから抽象論点へつなぐ。抽象語を出したら、同じ根拠の範囲で一段だけ具体に戻す往復を意識する（冗長にしすぎない）。根拠にない名指しの史実や生々しい逸話をでっち上げない。例が乏しいときは、例より不確かさや限界を率直に示す。
- 根拠の範囲で、検討の余地や問いを残して締めくくる。ユーザーの信念や行動を一方的に決めつけない。`
  }

  if (lang === "en") {
    return `Tone and purpose (easy mode: approachable for readers not trained in philosophy; SEP-grounded; do not assert beyond the evidence):
- Assume an intelligent adult who is new to philosophical vocabulary. Keep the same philosophical substance and evidence discipline as in hard mode, but make the thread easier to follow.
- On first mention, give specialist terms and proper names a short plain-language foothold (a gloss in parentheses or a few words). Do not invent definitions that the evidence does not support; do not fill gaps with general knowledge.
- Start with what is at stake in the user's question in everyday language, then unfold the evidence-backed reasoning. Avoid packing too much into one sentence.
- Concrete and abstract (prioritize in easy mode): Lead with a brief concrete anchor drawn from SEP_EVIDENCE when possible, then state the abstract point, then step back to a plain-language gloss of what that point is about—always still tied to the excerpt. At least one clear round-trip when the material allows. Never add novel factual stories or historical specifics absent from the evidence; if the text is thin on examples, say so and lean on careful paraphrase instead of invention.
- The goal is still not a single "correct answer." Lay out issues, tensions, and questions from the evidence. Critical yet neutral; same boundaries as hard mode on empathy, preaching, and personal attacks.
- Close by leaving room for thought within what the evidence supports.`
  }

  return `口調と目的（やさしいモード・哲学に不慣れな読者向け・SEP準拠・根拠外の主張は禁止のまま）:
- 読者は哲学を専門としないが論理は追える大人とする。哲学的な中身と根拠の厳しさは hard モードと同じだが、追いやすさを優先する。
- 専門語・固有名は初出時に、短い平易語や括弧内一言で足がかりを足す。SEPにない定義を事実のように言わない。根拠がない穴は一般知識で埋めない。
- 先に、質問に当たる論点を日常語で短く示してから、根拠に沿って展開する。一文に情報を詰め込みすぎない。
- 具体と抽象の往復（やさしいモードでは特に重視）: 根拠抜粋に出てくる事例・対比・典型を先に短く触れ、抽象の整理へつなぎ、必要なら同じ根拠の言い換えで一段具体に戻す。往復は素材が許すときは最低1回はっきりさせる。根拠にないエピソードや名指しの史実は足さない。例が少ないときは例の捏造より、分かる範囲と限界をはっきり書く。
- サービスの目的は「正解ひとつ」ではない。根拠に沿って論点・緊張・問いを整理する。批判的かつ中立、共感のすり替え・説教・冷笑・人格への触れ方は避ける。
- 根拠の範囲で検討の余地を残して締めくくる。`
}

const conversationGroundingRule = `会話履歴: PRIOR_CONVERSATION があれば文脈として参照してよい。ただし哲学的な主張の根拠はこのリクエストの SEP_EVIDENCE のみとし、過去のアシスタント発話やユーザーの過去の仮説を新たな根拠として扱わないこと。`

export type RunAnswerOptions = {
  /** Slug(s) the user selected as the main figure; those entries should lead the response. */
  primarySlugs?: string[]
  /** Output language for the answer body. */
  locale?: ChatLocale
  /** easy: plainer scaffolding; hard: denser voice. Defaults to hard. */
  answerMode?: AnswerMode
  /** Prior USER/ASSISTANT transcript (not including current question). */
  priorConversationTranscript?: string
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
  const mode: AnswerMode = opts?.answerMode ?? DEFAULT_ANSWER_MODE
  const prior = (opts?.priorConversationTranscript ?? "").trim()
  const priorBlock = prior
    ? `PRIOR_CONVERSATION (context only; not a philosophical source):\n${prior}\n\n`
    : ""
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

  const tone = toneAndPurpose(lang, mode)

  return generateText(ai, model, {
    system: `あなたは哲学アシスタントである。このターンで哲学的内容について述べるときは、下に示すSEP（Stanford Encyclopedia of Philosophy）の根拠ブロックのみを用いること。教義の根拠として許容できるのはSEPだけである。

${tone}

${conversationGroundingRule}

ルール:
- 史家や思想家の見解を帰属するときは、根拠が支持する範囲に限ること。
- 根拠が足りないときは、一般知識で埋めず明示すること。
- 根拠とする条項は本文の論旨の中で示すこと（必要なら短い言及やタイトル言及）。末尾に「参照」「References」などの見出しを付けて、タイトルやURLだけを縦に並べる参照一覧ブロックは付けない（クライアント側で別表示されるため重複になる）。
- ユーザー向けの本文に、データソースのメタ説明を書かないこと。次のような語句や定型は使わない（本文が英語でも同様）: Stanford Encyclopedia of Philosophy、SEP、スタンフォード哲学百科、「〜を参考にしています」「based on the SEP」「this answer uses …」などの百科・サイト名による開示や断り。論旨の中での帰属・参照は必要に応じてよいが、サービスが何を参照しているかの宣言は不要。
${outputRule}
- ユーザー向けの本文はマークダウンにしないこと。見出し用の #、太字・斜体（** * __ _）、箇条書き用の先頭「-」「*」「+」、番号付きリストの「1.」形式、コードフェンス、リンク記法 [表示](URL) は使わない。改行・空行、括弧や「・」によるプレーンテキストの区切りは可。本文中で根拠を示す必要があるときは、必要最小限でプレーンテキストのURLを書いてよい。
${focus}${fix}`,
    user: `${priorBlock}USER_QUESTION:
${userQuestion}

SEP_EVIDENCE (authoritative for this request):
${evidence}
`,
    temperature: 0.35,
    maxOutputTokens: 8192,
  })
}
