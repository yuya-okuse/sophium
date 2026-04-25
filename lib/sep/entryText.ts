import { load } from "cheerio"

import { entryUrl } from "./constants"

const DEFAULT_UA = "Sophium/0.1 (philosophy Q&A; respects SEP; contact: local-dev)"

function sepHeaders(): HeadersInit {
  const ua = process.env.SEP_USER_AGENT?.trim() || DEFAULT_UA
  return {
    "User-Agent": ua,
    Accept: "text/html,application/xhtml+xml",
  }
}

/**
 * Strips footers / nav noise and returns plain text from the main entry body.
 */
function htmlToEntryPlainText(html: string): string {
  const $ = load(html)
  const root = $("#aueditable")
  if (root.length === 0) {
    const article = $("#article")
    if (article.length) {
      article.find("script, style, #toc, #article-copyright").remove()
      return article.text().replace(/\s+/g, " ").trim()
    }
    $("script, style").remove()
    return $("body").text().replace(/\s+/g, " ").trim()
  }
  root.find("script, style, #toc").remove()
  return root.text().replace(/\s+/g, " ").trim()
}

/**
 * Fetches a single entry page and returns a truncated plain-text excerpt.
 */
export async function getEntryPlainText(
  slug: string,
  maxChars: number
): Promise<string> {
  const url = entryUrl(slug)
  const res = await fetch(url, {
    headers: sepHeaders(),
    next: { revalidate: 86_400 },
  })
  if (!res.ok) {
    throw new Error(`SEP entry fetch failed for ${slug}: ${res.status}`)
  }
  const html = await res.text()
  const full = htmlToEntryPlainText(html)
  if (full.length <= maxChars) return full
  return full.slice(0, maxChars).trimEnd() + "\n\n[Excerpt truncated for length.]"
}
