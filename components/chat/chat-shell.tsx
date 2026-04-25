"use client"

import { ArrowUp } from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useState } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { SepPhilosophersFile } from "@/lib/sep/philosophersList"
import sepPhilosophersList from "@/data/sep-philosophers.json"
import { Link, usePathname } from "@/i18n/navigation"

type ChatRole = "user" | "assistant"

type Citation = {
  title: string
  url: string
  slug: string
}

type ChatTurn = {
  role: ChatRole
  content: string
  citations?: Citation[]
  reviewVerdict?: "pass" | "fail" | "skipped"
}

const sepPhilosophers = sepPhilosophersList as SepPhilosophersFile

function displayPhilosopherTitle(
  item: SepPhilosophersFile["items"][number],
  locale: string
) {
  if (locale === "ja" && item.titleJa) {
    return item.titleJa
  }
  return item.title
}

export function ChatShell() {
  const t = useTranslations("Chat")
  const locale = useLocale()
  const pathname = usePathname()
  const [input, setInput] = useState("")
  const [philosopherSlug, setPhilosopherSlug] = useState("")
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return

      setError(null)
      setInput("")
      setMessages((prev) => [...prev, { role: "user", content: trimmed }])
      setLoading(true)

      try {
        const body: {
          message: string
          philosopherSlug?: string
          locale: string
        } = {
          message: trimmed,
          locale,
        }
        if (philosopherSlug.trim()) {
          body.philosopherSlug = philosopherSlug.trim()
        }
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        const data: unknown = await res.json().catch(() => null)
        const reply =
          data &&
          typeof data === "object" &&
          "reply" in data &&
          typeof (data as { reply: unknown }).reply === "string"
            ? (data as { reply: string }).reply
            : null

        const errMsg =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : null

        if (!res.ok || !reply) {
          setError(errMsg ?? t("errorGeneric", { status: res.status }))
          return
        }

        const citations =
          data &&
          typeof data === "object" &&
          "citations" in data &&
          Array.isArray((data as { citations: unknown }).citations)
            ? (data as { citations: Citation[] }).citations
            : undefined

        const reviewVerdict =
          data &&
          typeof data === "object" &&
          "reviewVerdict" in data &&
          typeof (data as { reviewVerdict: unknown }).reviewVerdict ===
            "string"
            ? (data as { reviewVerdict: "pass" | "fail" | "skipped" })
                .reviewVerdict
            : undefined

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            citations,
            reviewVerdict,
          },
        ])
      } catch {
        setError(t("errorNetwork"))
      } finally {
        setLoading(false)
      }
    },
    [locale, philosopherSlug, t]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!loading) void sendMessage(e.currentTarget.value)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-16 font-sans">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {locale === "ja" ? (
          <Link
            href={pathname}
            locale="en"
            className="underline-offset-2 hover:underline"
          >
            {t("switchToEn")}
          </Link>
        ) : (
          <Link
            href={pathname}
            locale="ja"
            className="underline-offset-2 hover:underline"
          >
            {t("switchToJa")}
          </Link>
        )}
      </p>

      <div
        className="relative size-28 shrink-0"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-amber-300 to-yellow-200 opacity-90 blur-2xl" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-orange-500/80 to-amber-200/90 blur-md" />
      </div>

      <p className="max-w-md text-center text-base leading-relaxed text-foreground">
        {t("blurb")}
      </p>

      {messages.length > 0 && (
        <div
          className="w-full max-w-2xl max-h-[min(50vh,28rem)] space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4 text-left shadow-sm"
          role="log"
          aria-live="polite"
        >
          {loading && (
            <p
              className="text-sm text-muted-foreground"
              aria-live="assertive"
            >
              {t("loading")}
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={
                m.role === "user"
                  ? "ml-8 rounded-xl bg-muted/80 px-3 py-2 text-sm text-foreground"
                  : "mr-8 space-y-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              }
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground/80">
                    {t("citationsLabel")}
                  </p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {m.citations.map((c) => (
                      <li key={c.url}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-2 hover:underline"
                        >
                          {c.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {m.reviewVerdict === "fail" && (
                    <p className="mt-2 text-amber-600 dark:text-amber-500">
                      {t("reviewWarning")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p
          className="max-w-2xl text-center text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="w-full max-w-2xl space-y-2">
        <div className="space-y-1">
          <label
            htmlFor="philosopher-select"
            className="block text-left text-sm text-muted-foreground"
          >
            {t("philosopherLabel", { count: sepPhilosophers.items.length })}
          </label>
          <select
            id="philosopher-select"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            value={philosopherSlug}
            onChange={(e) => setPhilosopherSlug(e.target.value)}
            disabled={loading}
            aria-label={t("philosopherSelectAria")}
          >
            <option value="">{t("philosopherNone")}</option>
            {sepPhilosophers.items.map((e) => (
              <option key={e.slug} value={e.slug}>
                {displayPhilosopherTitle(e, locale)}
              </option>
            ))}
          </select>
        </div>
        <label htmlFor="chat-composer" className="sr-only">
          {t("composerLabel")}
        </label>
        <InputGroup className="h-auto min-h-12 overflow-hidden rounded-2xl border-border bg-card py-1.5 pr-1.5 shadow-md has-[[data-slot=input-group-control]:focus-visible]:ring-offset-0">
          <InputGroupInput
            id="chat-composer"
            placeholder={t("placeholder")}
            autoComplete="off"
            className="h-auto min-h-10 rounded-l-2xl px-4 py-2.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
          />
          <InputGroupAddon
            align="inline-end"
            className="flex shrink-0 items-center py-0 pr-1 pl-1"
          >
            <InputGroupButton
              aria-label={t("send")}
              variant="default"
              size="icon-sm"
              className="size-9 shrink-0 rounded-full"
              onClick={() => {
                if (!loading) void sendMessage(input)
              }}
              disabled={loading || !input.trim()}
            >
              <ArrowUp weight="bold" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )
}
