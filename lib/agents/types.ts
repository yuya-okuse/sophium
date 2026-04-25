export type EvidenceItem = {
  slug: string
  title: string
  url: string
  /** Plain text excerpt from fetched SEP entry HTML; sole philosophical source. */
  textExcerpt: string
}

export type EvidencePack = {
  items: EvidenceItem[]
}

export type ReviewResult = {
  verdict: "pass" | "fail"
  factualIssues: string[]
  groundingIssues: string[]
}

export type Citation = {
  title: string
  url: string
  slug: string
}

export type PipelineResult = {
  reply: string
  citations: Citation[]
  reviewVerdict: "pass" | "fail" | "skipped"
  usedRetry: boolean
}
