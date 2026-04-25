"use client"

import { ArrowUp } from "@phosphor-icons/react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

export function ChatShell() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-background px-4 py-16 font-sans">
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
            >
              <ArrowUp weight="bold" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )
}
