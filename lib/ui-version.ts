export type UiVersion = "v1" | "v2"

export const UI_VERSION_STORAGE_KEY = "ww-ui-version"
export const UI_VERSION_CHANGE_EVENT = "ww-ui-version-change"

export function parseUiVersion(value: unknown): UiVersion | null {
  return value === "v1" || value === "v2" ? value : null
}

// Priority: url param > session storage > user preference > v1.
// `overridden` is true when the choice came from the comparison override
// (param or storage), which is what makes the floating toggle visible.
export function resolveUiVersion(input: {
  param: string | null
  stored: string | null
  preference: unknown
}): { version: UiVersion; overridden: boolean } {
  const fromParam = parseUiVersion(input.param)
  if (fromParam) return { version: fromParam, overridden: true }

  const fromStored = parseUiVersion(input.stored)
  if (fromStored) return { version: fromStored, overridden: true }

  const fromPreference = parseUiVersion(input.preference)
  if (fromPreference) return { version: fromPreference, overridden: false }

  return { version: "v1", overridden: false }
}

// sessionStorage can throw in LINE in-app browsers and private mode.
export function readStoredUiVersion(): string | null {
  try {
    return window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeStoredUiVersion(version: UiVersion): void {
  try {
    window.sessionStorage.setItem(UI_VERSION_STORAGE_KEY, version)
  } catch {
    // Ignore: the url param still carries the choice for this page.
  }
}
