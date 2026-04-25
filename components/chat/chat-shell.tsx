"use client"

import { ArrowUp } from "@phosphor-icons/react"
import { useCallback, useState } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

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

export function ChatShell() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    setError(null)
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
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
        setError(errMsg ?? `Request failed (${res.status}).`)
        return
      }

      const citations =
        data &&
        typeof data === "object" &&
        "citations" in data &&
        Array.isArray((data as { citations: unknown }).citations)
          ? ((data as { citations: Citation[] }).citations)
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
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!loading) void sendMessage(e.currentTarget.value)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-16 font-sans">
      <div
        className="relative size-28 shrink-0"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-amber-300 to-yellow-200 opacity-90 blur-2xl" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-orange-500/80 to-amber-200/90 blur-md" />
      </div>

      <p className="max-w-md text-center text-base leading-relaxed text-foreground">
        Stanford Encyclopedia of Philosophy（SEP）の条項だけを根拠に、多段の Gemini
        エージェントが回答を組み立てます（取得 → 回答 → レビュー → 最終整形）。
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
              処理中: SEP
              から条項を取得し、回答・レビュー・最終整形を行っています（数十秒かかることがあります）…
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
                  <p className="mb-1 font-medium text-foreground/80">SEP 参照</p>
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
                      自動レビューは完全には通過しませんでした。回答は慎重に扱ってください。
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

      <div className="w-full max-w-2xl">
        <label htmlFor="chat-composer" className="sr-only">
          Message
        </label>
        <InputGroup className="h-auto min-h-12 overflow-hidden rounded-2xl border-border bg-card py-1.5 pr-1.5 shadow-md has-[[data-slot=input-group-control]:focus-visible]:ring-offset-0">
          <InputGroupInput
            id="chat-composer"
            placeholder="哲学者の立場の違い、概念の定義、SEP に載っている論点について質問…"
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
              aria-label="Send message"
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
