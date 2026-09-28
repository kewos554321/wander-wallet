import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { Suspense } from "react"

vi.mock("@/components/ui-version/ui-version-switch", () => ({
  UiVersionSwitch: ({ v1, v2 }: { v1: React.ReactNode; v2: React.ReactNode }) => (
    <div>
      <div data-testid="v1">{v1}</div>
      <div data-testid="v2">{v2}</div>
    </div>
  ),
}))

vi.mock("@/components/v1/new-project/new-project-v1", () => ({
  NewProjectV1: () => <span>NewProjectV1</span>,
}))

vi.mock("@/components/v2/new-project/new-project-v2", () => ({
  NewProjectV2: () => <span>NewProjectV2</span>,
}))

vi.mock("@/components/v1/project-settings/project-settings-v1", () => ({
  ProjectSettingsV1: ({ projectId }: { projectId: string }) => <span>{`ProjectSettingsV1:${projectId}`}</span>,
}))

vi.mock("@/components/v2/project-settings/project-settings-v2", () => ({
  ProjectSettingsV2: ({ projectId }: { projectId: string }) => <span>{`ProjectSettingsV2:${projectId}`}</span>,
}))

vi.mock("@/components/v1/settings/general-settings-v1", () => ({
  GeneralSettingsV1: () => <span>GeneralSettingsV1</span>,
}))

vi.mock("@/components/v2/settings/general-settings-v2", () => ({
  GeneralSettingsV2: () => <span>GeneralSettingsV2</span>,
}))

import NewProjectPage from "@/app/projects/new/page"
import ProjectSettingsPage from "@/app/projects/[id]/settings/page"
import SettingsPage from "@/app/settings/page"

describe("Pages with UI version switch", () => {
  it("renders NewProjectPage with both v1 and v2", () => {
    render(<NewProjectPage />)
    expect(screen.getByTestId("v1")).toHaveTextContent("NewProjectV1")
    expect(screen.getByTestId("v2")).toHaveTextContent("NewProjectV2")
  })

  it("renders ProjectSettingsPage with both v1 and v2", async () => {
    render(
      <Suspense>
        <ProjectSettingsPage params={Promise.resolve({ id: "p1" })} />
      </Suspense>
    )
    expect(await screen.findByText("ProjectSettingsV1:p1")).toBeInTheDocument()
    expect(screen.getByTestId("v2")).toHaveTextContent("ProjectSettingsV2:p1")
  })

  it("renders SettingsPage with both v1 and v2", () => {
    render(<SettingsPage />)
    expect(screen.getByTestId("v1")).toHaveTextContent("GeneralSettingsV1")
    expect(screen.getByTestId("v2")).toHaveTextContent("GeneralSettingsV2")
  })
})
