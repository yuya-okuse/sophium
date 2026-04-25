"use client"

import { CaretDown } from "@phosphor-icons/react"
import { Combobox } from "@base-ui/react/combobox"
import { useCallback, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import type { SepPhilosophersFile } from "@/lib/sep/philosophersList"
import {
  createPhilosopherFuse,
  defaultPhilosopherFuzzyCap,
  philosopherRowsFromItems,
  searchPhilosopherSlugs,
} from "@/lib/sep/philosopherFuse"

export type PhilosopherComboboxLabels = {
  label: string
  none: string
  searchPlaceholder: string
  empty: string
}

type PhilosopherComboboxProps = {
  items: SepPhilosophersFile["items"]
  locale: string
  value: string
  onChange: (slug: string) => void
  disabled?: boolean
  labels: PhilosopherComboboxLabels
}

function titleForSlug(
  list: SepPhilosophersFile["items"],
  slug: string,
  loc: string
): string {
  const e = list.find((i) => i.slug === slug)
  if (!e) return slug
  if (loc === "ja" && e.titleJa) return e.titleJa
  return e.title
}

export function PhilosopherCombobox({
  items,
  locale,
  value,
  onChange,
  disabled,
  labels,
}: PhilosopherComboboxProps) {
  const rows = useMemo(() => philosopherRowsFromItems(items), [items])
  const fuse = useMemo(() => createPhilosopherFuse(rows), [rows])
  const itemSlugs = useMemo(
    () => ["", ...rows.map((r) => r.slug)] as string[],
    [rows]
  )
  const fuzzyCap = defaultPhilosopherFuzzyCap()

  const [query, setQuery] = useState("")

  const filteredSlugs = useMemo(() => {
    const searched = searchPhilosopherSlugs(fuse, rows, query, fuzzyCap)
    let slugs = [...searched]
    if (value && !slugs.includes(value)) {
      slugs = [value, ...slugs.filter((s) => s !== value)]
    }
    if (query.trim()) {
      slugs = slugs.slice(0, fuzzyCap)
    }
    return ["", ...slugs] as string[]
  }, [fuse, rows, query, value, fuzzyCap])

  const itemToStringLabel = useCallback(
    (slug: string) => (slug === "" ? labels.none : titleForSlug(items, slug, locale)),
    [items, locale, labels.none]
  )

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setQuery("")
  }, [])

  const searched = useMemo(
    () => searchPhilosopherSlugs(fuse, rows, query, fuzzyCap),
    [fuse, rows, query, fuzzyCap]
  )
  const showNoMatchHint =
    query.trim().length > 0 && searched.length === 0 && value === ""

  return (
    <div className="flex flex-col gap-1">
      <Combobox.Root
        value={value}
        onValueChange={(next) => {
          onChange(next ?? "")
        }}
        onOpenChange={handleOpenChange}
        items={itemSlugs}
        filteredItems={filteredSlugs}
        inputValue={query}
        onInputValueChange={(q) => setQuery(q)}
        itemToStringLabel={itemToStringLabel}
        disabled={disabled}
        modal={false}
        autoHighlight
      >
        <Combobox.Label className="block text-left text-xs text-muted-foreground">
          {labels.label}
        </Combobox.Label>

        <Combobox.Trigger
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-none border border-input bg-background px-2.5 text-left text-xs text-foreground outline-none transition-colors",
            "hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-input/30"
          )}
          aria-label={labels.label}
        >
          <Combobox.Value placeholder={labels.none} />
          <CaretDown className="size-4 shrink-0 text-muted-foreground" weight="bold" />
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner
            className="isolate z-50 outline-none"
            side="top"
            sideOffset={6}
            align="start"
          >
            <Combobox.Popup
              className={cn(
                "flex max-h-[min(24rem,calc(100dvh-8rem))] w-[var(--anchor-width)] flex-col gap-0 rounded-none border border-border bg-popover text-popover-foreground shadow-md outline-none",
                "origin-[var(--transform-origin)] data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
                "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
              )}
            >
              <div className="shrink-0 border-b border-border p-1">
                <Combobox.Input
                  placeholder={labels.searchPlaceholder}
                  className={cn(
                    "h-8 w-full rounded-none border border-transparent bg-transparent px-2 py-1 text-xs outline-none",
                    "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  )}
                />
              </div>
              {showNoMatchHint ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">{labels.empty}</p>
              ) : null}
              <Combobox.List className="min-h-0 flex-1 scroll-py-1 overflow-y-auto p-1">
                {(slug: string) => (
                  <Combobox.Item
                    key={slug === "" ? "__none__" : slug}
                    value={slug}
                    className={cn(
                      "flex cursor-default select-none items-center rounded-none px-2 py-1.5 text-xs outline-none",
                      "data-highlighted:bg-muted data-highlighted:text-foreground",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    )}
                  >
                    {itemToStringLabel(slug)}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  )
}
