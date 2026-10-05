import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(process.cwd(), "components/v2")
const EXEMPT = new Set<string>()
const BANNED = [/-\[#[0-9a-fA-F]{3,8}\]/, /\bbg-white\b/, /\btext-white\b/, /\bbg-black\b/, /\bdark:/]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : []
  })
}

describe("components/v2 uses tokens only", () => {
  it("has no hard-coded colors or dark: variants", () => {
    const hits: string[] = []
    for (const f of files(ROOT)) {
      const rel = f.slice(ROOT.length + 1)
      if (EXEMPT.has(rel)) continue
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (BANNED.some((re) => re.test(line))) hits.push(`${rel}:${i + 1}: ${line.trim()}`)
      })
    }
    expect(hits).toEqual([])
  })
})
