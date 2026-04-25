import { SEP_CONTENTS_URL } from "./constants"

const DEFAULT_UA = "Sophium/0.1 (philosophy Q&A; respects SEP; contact: local-dev)"

function sepHeaders(): HeadersInit {
  const ua = process.env.SEP_USER_AGENT?.trim() || DEFAULT_UA
  return {
    "User-Agent": ua,
    Accept: "text/html,application/xhtml+xml",
  }
}

/**
 * Fetches the SEP table of contents. Uses Next.js fetch cache when available.
 */
export async function getContentsHtml(): Promise<string> {
  const res = await fetch(SEP_CONTENTS_URL, {
    headers: sepHeaders(),
    next: { revalidate: 86_400 },
  })
  if (!res.ok) {
    throw new Error(
      `Failed to load SEP table of contents (${res.status} ${res.statusText}).`
    )
  }
  return res.text()
}
