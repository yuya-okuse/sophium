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

type ChatTurn = {
  role: ChatRole
  content: string;
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

      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
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
        Neo AI’s legacy few ideas to round out your dashboard with a third card.
        Each follows the main.
      </p>

      {messages.length > 0 && (
        <div
          className="w-full max-w-2xl max-h-[min(50vh,28rem)] space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4 text-left shadow-sm"
          role="log"
          aria-live="polite"
        >
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={
                m.role === "user"
                  ? "ml-8 rounded-xl bg-muted/80 px-3 py-2 text-sm text-foreground"
                  : "mr-8 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground whitespace-pre-wrap"
              }
            >
              {m.content}
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
            placeholder="pixelate a few ideas to round out your dashboard…"
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
