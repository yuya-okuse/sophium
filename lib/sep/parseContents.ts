import { load } from "cheerio"

import { entryUrl } from "./constants"

export type SepIndexEntry = {
  slug: string
  title: string
  url: string
}

/**
 * Parses contents.html: collects unique `entries/<slug>/` links and visible anchor text.
 */
export function parseContentsHtml(html: string): SepIndexEntry[] {
  const $ = load(html)
  const bestTitle = new Map<string, string>()

  $('a[href^="entries/"]').each((_, el) => {
    const href = $(el).attr("href")?.trim() ?? ""
    const m = href.match(/^entries\/([^/]+)\/?$/)
    if (!m) return
    const slug = m[1]
    const title = $(el).text().replace(/\s+/g, " ").trim()
    if (!title) return
    const prev = bestTitle.get(slug)
    if (!prev || title.length > prev.length) {
      bestTitle.set(slug, title)
    }
  })

  return Array.from(bestTitle.entries())
    .map(([slug, title]) => ({
      slug,
      title,
      url: entryUrl(slug),
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
}
