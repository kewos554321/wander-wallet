import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"

vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { preferences: null } }),
}))

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { UiVersionToggle } from "@/components/ui-version/ui-version-toggle"

describe("UiVersionSwitch / UiVersionToggle", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState(null, "", "/projects")
  })

  it("renders v2 by default and hides the toggle", async () => {
    render(
      <>
        <UiVersionSwitch v1={<p>old</p>} v2={<p>new</p>} />
        <UiVersionToggle />
      </>
    )
    expect(await screen.findByText("new")).toBeInTheDocument()
    expect(screen.queryByText("old")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /切換到/ })).not.toBeInTheDocument()
  })

  it("renders v2 with ?ui=v2 and the toggle switches back", async () => {
    window.history.replaceState(null, "", "/projects?ui=v2")
    render(
      <>
        <UiVersionSwitch v1={<p>old</p>} v2={<p>new</p>} />
        <UiVersionToggle />
      </>
    )
    expect(await screen.findByText("new")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "切換到 V1" }))

    await waitFor(() => expect(screen.getByText("old")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "切換到 V2" })).toBeInTheDocument()
  })
})
