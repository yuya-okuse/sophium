/** UI / pipeline output language (aligns with next-intl locales). */
export type ChatLocale = "en" | "ja"

export function parseChatLocale(
  value: unknown,
  acceptLanguageHeader: string | null
): ChatLocale {
  if (value === "en" || value === "ja") {
    return value
  }
  if (typeof acceptLanguageHeader === "string") {
    const first = acceptLanguageHeader.split(",")[0]?.trim().toLowerCase() ?? ""
    if (first.startsWith("en")) return "en"
    if (first.startsWith("ja")) return "ja"
  }
  return "ja"
}
