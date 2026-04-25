export const SEP_BASE = "https://plato.stanford.edu" as const

export const SEP_CONTENTS_PATH = "/contents.html" as const

export const SEP_CONTENTS_URL = `${SEP_BASE}${SEP_CONTENTS_PATH}`

export function entryUrl(slug: string): string {
  const s = slug.replace(/^\/+|\/+$/g, "")
  return `${SEP_BASE}/entries/${s}/`
}
