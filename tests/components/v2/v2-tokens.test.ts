import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

function block(selector: string): string {
  const start = css.indexOf(`\n${selector} {`)
  expect(start).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf("}", start))
}

const NEW_TOKENS: Record<string, [string, string]> = {
  "lake-edge": ["#B7D9CB", "#2E5A4C"],
  "danger-tint": ["#FDF1EC", "#2A1713"],
  "danger-border": ["#F3D3C4", "#5A2E23"],
  "danger-wash": ["#FDF2EF", "#2E1914"],
  "danger-edge": ["#E8A796", "#6A3A2E"],
  "coral-deep": ["#8F3714", "#E89872"],
  "sky-tint": ["#D3E0F5", "#28354A"],
  "line-green": ["#06C755", "#06C755"],
  "camera-bg": ["#171412", "#171412"],
  "on-dark": ["#FFFFFF", "#FFFFFF"],
}

describe("v2 tokens added in milestone 6", () => {
  const light = block('[data-ui="v2"]')
  const dark = block('.dark [data-ui="v2"]')

  for (const [name, [lightValue, darkValue]] of Object.entries(NEW_TOKENS)) {
    it(`defines --v2-${name} in light and dark blocks`, () => {
      expect(light).toContain(`--v2-${name}: ${lightValue};`)
      expect(dark).toContain(`--v2-${name}: ${darkValue};`)
    })

    it(`maps --color-v2-${name} in @theme inline`, () => {
      expect(css).toContain(`--color-v2-${name}: var(--v2-${name});`)
    })
  }

  it("does not change the existing lake-border token", () => {
    expect(light).toContain("--v2-lake-border: #DDEDE6;")
    expect(dark).toContain("--v2-lake-border: #2C4A41;")
  })

  it("defines the v2-scoped scroll utility", () => {
    expect(css).toContain('[data-ui="v2"] .v2-scroll')
    expect(css).toContain("scrollbar-width: thin;")
  })
})
