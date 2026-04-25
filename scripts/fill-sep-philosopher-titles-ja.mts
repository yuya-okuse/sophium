/**
 * Fills `data/sep-philosopher-titles.ja.json` for every slug in `data/sep-philosophers.json`
 * using Gemini (batched). Skips slugs that already have a non-empty value unless
 * `FILL_JA_OVERWRITE=1` or `--force`.
 *
 * Run: pnpm run fill:sep-philosopher-titles-ja
 * Then: pnpm run generate:sep-philosophers
 *
 * Requires: GEMINI_API_KEY, optional GEMINI_MODEL (default gemini-2.5-flash, same as /api/chat)
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { GoogleGenAI } from "@google/genai"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const CHUNK = 40
const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"

async function generateJson<T>(
  ai: InstanceType<typeof GoogleGenAI>,
  model: string,
  {
    system,
    user,
    schema,
    temperature = 0.2,
    maxOutputTokens,
  }: {
    system: string
    user: string
    schema: unknown
    temperature?: number
    maxOutputTokens?: number
  }
): Promise<T> {
  const response = await ai.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature,
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    },
  })
  const text = response.text?.trim()
  if (!text) {
    throw new Error("The model returned no JSON.")
  }
  return JSON.parse(text) as T
}

const chunkResponseSchema = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string" },
          titleJa: { type: "string" },
        },
        required: ["slug", "titleJa"],
        additionalProperties: false,
      },
    },
  },
  required: ["translations"],
  additionalProperties: false,
} as const

type SepFile = { items: { slug: string; title: string }[] }

function shouldOverwrite(): boolean {
  if (process.argv.includes("--force")) return true
  if (process.env.FILL_JA_OVERWRITE === "1") return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function translateChunk(
  ai: InstanceType<typeof GoogleGenAI>,
  model: string,
  chunk: { slug: string; title: string }[]
): Promise<Record<string, string>> {
  const system = `You produce Japanese display labels for Stanford Encyclopedia of Philosophy (SEP) entry titles.
These appear in a Japanese UI dropdown. Output must be valid JSON only, matching the schema.
Rules:
- One Japanese string per entry (titleJa), concise, no extra commentary.
- Person names: common academic Japanese (often katakana, middle dot ・, historical figures may use known kanji/kana forms).
- Topics, schools, and concepts: established Japanese philosophy terminology where it exists; otherwise clear katakana/translation of the English SEP title.
- Do not copy the English string verbatim; always give a proper Japanese label.
- Keep consistent style across the batch.`

  const user = `Translate the following items. Return every slug exactly once in "translations" with a non-empty "titleJa".

ITEMS:
${JSON.stringify(chunk, null, 0)}`

  let raw: { translations: { slug: string; titleJa: string }[] } | undefined
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      raw = await generateJson<{
        translations: { slug: string; titleJa: string }[]
      }>(ai, model, {
        system,
        user,
        schema: chunkResponseSchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
      })
      break
    } catch (e: unknown) {
      const is429 =
        e !== null &&
        typeof e === "object" &&
        "status" in e &&
        (e as { status: number }).status === 429
      if (is429 && attempt < 3) {
        const wait = 12_000 + attempt * 4000
        console.warn(`  Rate limit (429); waiting ${wait}ms and retrying…`)
        await sleep(wait)
        continue
      }
      throw e
    }
  }
  if (!raw) {
    throw new Error("No response from model.")
  }

  const out: Record<string, string> = {}
  for (const row of raw.translations) {
    const s = String(row.slug ?? "").trim()
    const t = String(row.titleJa ?? "").trim()
    if (s && t) {
      out[s] = t
    }
  }
  if (Object.keys(out).length !== chunk.length) {
    const missing = chunk
      .map((c) => c.slug)
      .filter((s) => out[s] == null)
    throw new Error(
      `Model returned ${Object.keys(out).length} of ${chunk.length} entries. Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`
    )
  }
  return out
}

async function loadEnvLocalKey(): Promise<void> {
  try {
    const p = join(root, ".env.local")
    const raw = await readFile(p, "utf-8")
    for (const line of raw.split("\n")) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const m = t.match(/^GEMINI_API_KEY=(.*)$/)
      if (m && !process.env.GEMINI_API_KEY) {
        let v = m[1].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        process.env.GEMINI_API_KEY = v
      }
    }
  } catch {
    /* no .env.local or unreadable */
  }
}

async function main(): Promise<void> {
  await loadEnvLocalKey()
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error("Set GEMINI_API_KEY (or add it to .env.local) to run this script.")
    process.exit(1)
  }

  const force = shouldOverwrite()
  const sepPath = join(root, "data/sep-philosophers.json")
  const jaPath = join(root, "data/sep-philosopher-titles.ja.json")

  const sepRaw = await readFile(sepPath, "utf-8")
  const sep = JSON.parse(sepRaw) as SepFile
  if (!Array.isArray(sep.items) || sep.items.length === 0) {
    throw new Error("Invalid or empty data/sep-philosophers.json")
  }

  let existing: Record<string, string> = {}
  try {
    const j = await readFile(jaPath, "utf-8")
    const parsed = JSON.parse(j) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      existing = { ...(parsed as Record<string, string>) }
    }
  } catch {
    existing = {}
  }

  const toFill: { slug: string; title: string }[] = []
  for (const it of sep.items) {
    const slug = it.slug
    const cur = existing[slug]
    if (force) {
      toFill.push({ slug, title: it.title })
    } else if (cur == null || String(cur).trim() === "") {
      toFill.push({ slug, title: it.title })
    }
  }

  if (toFill.length === 0) {
    console.log("All slugs already have non-empty titleJa. Use --force to regenerate.")
    return
  }

  console.log(
    `Filling ${toFill.length} title(s) in chunks of ${CHUNK} (model: ${MODEL})${force ? " [force]" : ""}…`
  )

  const ai = new GoogleGenAI({ apiKey })
  for (let i = 0; i < toFill.length; i += CHUNK) {
    const part = toFill.slice(i, i + CHUNK)
    const n = i / CHUNK + 1
    const total = Math.ceil(toFill.length / CHUNK)
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        console.log(`  Chunk ${n}/${total} (${part.length} items)…`)
        const merged = await translateChunk(ai, MODEL, part)
        Object.assign(existing, merged)
        lastErr = undefined
        break
      } catch (e) {
        lastErr = e
        if (attempt < 2) {
          console.warn(`  Retry chunk ${n} (attempt ${attempt + 1}):`, e)
          await sleep(1500 * (attempt + 1))
        }
      }
    }
    if (lastErr) {
      throw lastErr
    }
    if (i + CHUNK < toFill.length) {
      await sleep(2000)
    }
  }

  const sortedKeys = Object.keys(existing).sort((a, b) => a.localeCompare(b))
  const ordered: Record<string, string> = {}
  for (const k of sortedKeys) {
    ordered[k] = existing[k]
  }

  await writeFile(jaPath, `${JSON.stringify(ordered, null, 2)}\n`, "utf-8")
  console.log(`Wrote ${Object.keys(ordered).length} keys to ${jaPath}`)
  console.log("Run: pnpm run generate:sep-philosophers")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
