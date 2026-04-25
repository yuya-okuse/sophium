"use client"

import {
  At,
  Image as ImageIcon,
  List,
  ListNumbers,
  Microphone,
  Paperclip,
  PaperPlaneTilt,
  Smiley,
  Sparkle,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
} from "@phosphor-icons/react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import type { SepPhilosophersFile } from "@/lib/sep/philosophersList"
import sepPhilosophersList from "@/data/sep-philosophers.json"
type ChatRole = "user" | "assistant"

type Citation = {
  title: string
  url: string
  slug: string
}

type ChatTurn = {
  role: ChatRole
  content: string
  at: number
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

function useChatLocaleBcp47(locale: string): string {
  if (locale === "ja") return "ja-JP"
  return "en-GB"
}

function FakeToolbarIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 items-center justify-center text-muted-foreground">
      {children}
    </span>
  )
}

export function ChatShell() {
  const t = useTranslations("Chat")
  const locale = useLocale()
  const bcp = useChatLocaleBcp47(locale)
  const [input, setInput] = useState("")
  const [philosopherSlug, setPhilosopherSlug] = useState("")
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const todayLabel = new Date().toLocaleDateString(bcp, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const formatTime = useCallback(
    (at: number) =>
      new Date(at).toLocaleTimeString(bcp, {
        hour: "numeric",
        minute: "2-digit",
      }),
    [bcp]
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return

      setError(null)
      setInput("")
      const userAt = Date.now()
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed, at: userAt },
      ])
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
            at: Date.now(),
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!loading) void sendMessage(e.currentTarget.value)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-background font-sans">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-4"
        role="log"
        aria-live="polite"
      >
        <p className="text-center text-xs text-muted-foreground">
          {todayLabel}
        </p>
        {messages.length === 0 && !loading && (
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
            {t("blurbShort")}
          </p>
        )}

        <div className="mt-4 space-y-4">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={`${i}-user-${m.at}`}
                className="flex w-full flex-col items-end"
              >
                <div className="mb-1 text-right text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {t("messageYou")}
                  </span>
                  <span className="ml-2 tabular-nums text-muted-foreground">
                    {formatTime(m.at)}
                  </span>
                </div>
                <div className="flex max-w-[min(100%,24rem)] flex-row-reverse items-end gap-2">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xs font-semibold text-white shadow-sm"
                    title={t("messageYou")}
                  >
                    U
                  </div>
                  <div className="whitespace-pre-wrap rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 px-3.5 py-2.5 text-sm text-white shadow-sm">
                    {m.content}
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={`${i}-asst-${m.at}`}
                className="flex w-full flex-col items-start"
              >
                <div className="mb-1 text-left text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {t("messageAssistant")}
                  </span>
                  <span className="ml-2 tabular-nums text-muted-foreground">
                    {formatTime(m.at)}
                  </span>
                </div>
                <div className="flex max-w-[min(100%,24rem)] items-end gap-2">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-xs font-semibold text-zinc-800 shadow-sm dark:bg-zinc-600 dark:text-zinc-100"
                    title={t("messageAssistant")}
                  >
                    A
                  </div>
                  <div
                    className="space-y-2 rounded-2xl border border-zinc-200/90 bg-zinc-200/90 px-3.5 py-2.5 text-sm text-foreground shadow-sm dark:border-zinc-700/90 dark:bg-zinc-800/90"
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="border-t border-zinc-300/80 pt-2 text-xs text-muted-foreground dark:border-zinc-600/80">
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
                          <p className="mt-2 text-amber-700 dark:text-amber-400">
                            {t("reviewWarning")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {loading && (
            <p className="text-center text-sm italic text-muted-foreground">
              {t("loading")}
            </p>
          )}

          <div ref={endRef} className="h-px" aria-hidden />
        </div>
      </div>

      {error && (
        <p
          className="shrink-0 px-4 text-center text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="shrink-0 space-y-2 border-t border-border px-3 py-3">
        <div className="space-y-1">
          <label
            htmlFor="philosopher-select"
            className="block text-left text-xs text-muted-foreground"
          >
            {t("philosopherLabel", { count: sepPhilosophers.items.length })}
          </label>
          <select
            id="philosopher-select"
            className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
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

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg">
          <div className="flex items-start gap-2 border-b border-border/60 px-3 pt-2.5">
            <button
              type="button"
              className="mt-1 text-muted-foreground"
              tabIndex={-1}
              aria-hidden
            >
              <Smiley className="size-5" weight="regular" />
            </button>
            <label htmlFor="chat-composer" className="sr-only">
              {t("composerLabel")}
            </label>
            <textarea
              id="chat-composer"
              placeholder={t("placeholderComposer")}
              autoComplete="off"
              rows={3}
              className="min-h-[4.5rem] w-0 min-w-0 flex-1 resize-none border-0 bg-transparent py-0.5 text-sm text-foreground shadow-none ring-0 outline-none placeholder:text-muted-foreground focus-visible:ring-0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button
              type="button"
              className="mt-1 text-muted-foreground"
              tabIndex={-1}
              aria-hidden
            >
              <Sparkle className="size-5" weight="regular" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div
              className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto opacity-80 pointer-events-none select-none"
              aria-hidden
            >
              <FakeToolbarIcon>
                <At className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <Paperclip className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <TextB className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <TextItalic className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <TextUnderline className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <TextStrikethrough className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <List className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <ListNumbers className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <Microphone className="size-4" />
              </FakeToolbarIcon>
              <FakeToolbarIcon>
                <ImageIcon className="size-4" />
              </FakeToolbarIcon>
            </div>
            <Button
              type="button"
              aria-label={t("send")}
              className="size-10 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md hover:from-orange-600 hover:to-red-600"
              onClick={() => {
                if (!loading) void sendMessage(input)
              }}
              disabled={loading || !input.trim()}
            >
              <PaperPlaneTilt className="size-5" weight="bold" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
