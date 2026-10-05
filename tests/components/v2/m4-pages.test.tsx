import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// Only the UI-version preference resolution is mocked; the switch and both
// branches are rendered for real so the branch selection logic is exercised.
const mockUseUiVersion = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks/useUiVersion", () => ({ useUiVersion: () => mockUseUiVersion() }))

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"

describe("UiVersionSwitch", () => {
  beforeEach(() => mockUseUiVersion.mockReset())

  it("renders the v1 branch when the resolved version is v1", () => {
    mockUseUiVersion.mockReturnValue({ version: "v1", overridden: false, setVersion: vi.fn() })
    render(<UiVersionSwitch v1={<span>v1-content</span>} v2={<span>v2-content</span>} />)
    expect(screen.getByText("v1-content")).toBeInTheDocument()
    expect(screen.queryByText("v2-content")).not.toBeInTheDocument()
  })

  it("renders the v2 branch when the resolved version is v2", () => {
    mockUseUiVersion.mockReturnValue({ version: "v2", overridden: false, setVersion: vi.fn() })
    render(<UiVersionSwitch v1={<span>v1-content</span>} v2={<span>v2-content</span>} />)
    expect(screen.getByText("v2-content")).toBeInTheDocument()
    expect(screen.queryByText("v1-content")).not.toBeInTheDocument()
  })

  it("renders nothing while the version is unresolved", () => {
    mockUseUiVersion.mockReturnValue({ version: null, overridden: false, setVersion: vi.fn() })
    render(<UiVersionSwitch v1={<span>v1-content</span>} v2={<span>v2-content</span>} />)
    expect(screen.queryByText("v1-content")).not.toBeInTheDocument()
    expect(screen.queryByText("v2-content")).not.toBeInTheDocument()
  })

  it("renders the fallback while unresolved when one is provided", () => {
    mockUseUiVersion.mockReturnValue({ version: null, overridden: false, setVersion: vi.fn() })
    render(
      <UiVersionSwitch v1={<span>v1-content</span>} v2={<span>v2-content</span>} fallback={<span>loading</span>} />
    )
    expect(screen.getByText("loading")).toBeInTheDocument()
    expect(screen.queryByText("v1-content")).not.toBeInTheDocument()
    expect(screen.queryByText("v2-content")).not.toBeInTheDocument()
  })
})
