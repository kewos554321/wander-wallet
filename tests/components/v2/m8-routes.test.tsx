import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ComponentType } from "react"

const mockUseUiVersion = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks/useUiVersion", () => ({ useUiVersion: () => mockUseUiVersion() }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
// React.use(params) is unwrapped so the route pages render synchronously in jsdom.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>()
  return { ...actual, use: (value: unknown) => value }
})

vi.mock("@/components/v1/notes/notes-v1", () => ({ NotesV1: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v1-notes-${projectId}`}</div> }))
vi.mock("@/components/v2/notes/notes-v2", () => ({ NotesV2: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v2-notes-${projectId}`}</div> }))
vi.mock("@/components/v1/photos/photos-v1", () => ({ PhotosV1: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v1-photos-${projectId}`}</div> }))
vi.mock("@/components/v2/photos/photos-v2", () => ({ PhotosV2: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v2-photos-${projectId}`}</div> }))
vi.mock("@/components/v1/export/export-v1", () => ({ ExportV1: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v1-export-${projectId}`}</div> }))
vi.mock("@/components/v2/export/export-v2", () => ({ ExportV2: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v2-export-${projectId}`}</div> }))
vi.mock("@/components/v1/currency/currency-v1", () => ({ CurrencyV1: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v1-currency-${projectId}`}</div> }))
vi.mock("@/components/v2/currency/currency-v2", () => ({ CurrencyV2: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v2-currency-${projectId}`}</div> }))
vi.mock("@/components/v1/activity-logs/activity-logs-v1", () => ({ ActivityLogsV1: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v1-logs-${projectId}`}</div> }))
vi.mock("@/components/v2/activity-logs/activity-logs-v2", () => ({ ActivityLogsV2: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v2-logs-${projectId}`}</div> }))
vi.mock("@/components/v1/map/map-v1", () => ({ MapV1: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v1-map-${projectId}`}</div> }))
vi.mock("@/components/v2/map/map-v2", () => ({ MapV2: ({ projectId }: { projectId: string }) => <div data-testid="branch">{`v2-map-${projectId}`}</div> }))

import NotesPage from "@/app/projects/[id]/notes/page"
import PhotosPage from "@/app/projects/[id]/photos/page"
import ExportPage from "@/app/projects/[id]/export/page"
import CurrencyPage from "@/app/projects/[id]/currency/page"
import ActivityLogsPage from "@/app/projects/[id]/activity-logs/page"
import MapPage from "@/app/projects/[id]/map/page"

type PageProps = { params: Promise<{ id: string }> }

const ROUTES: { name: string; Page: ComponentType<PageProps>; key: string }[] = [
  { name: "notes", Page: NotesPage, key: "notes" },
  { name: "photos", Page: PhotosPage, key: "photos" },
  { name: "export", Page: ExportPage, key: "export" },
  { name: "currency", Page: CurrencyPage, key: "currency" },
  { name: "activity-logs", Page: ActivityLogsPage, key: "logs" },
  { name: "map", Page: MapPage, key: "map" },
]

describe("M8 route wiring", () => {
  beforeEach(() => mockUseUiVersion.mockReset())

  for (const { name, Page, key } of ROUTES) {
    it(`${name} renders the v2 branch when resolved to v2`, async () => {
      mockUseUiVersion.mockReturnValue({ version: "v2", overridden: false, setVersion: vi.fn() })
      render(<Page params={{ id: "p1" } as unknown as Promise<{ id: string }>} />)
      expect(await screen.findByTestId("branch")).toHaveTextContent(`v2-${key}-p1`)
    })

    it(`${name} renders the v1 branch when resolved to v1`, async () => {
      mockUseUiVersion.mockReturnValue({ version: "v1", overridden: false, setVersion: vi.fn() })
      render(<Page params={{ id: "p1" } as unknown as Promise<{ id: string }>} />)
      expect(await screen.findByTestId("branch")).toHaveTextContent(`v1-${key}-p1`)
    })
  }
})
