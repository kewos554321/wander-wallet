import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PhotosV2View, type PhotoExpense } from "@/components/v2/photos/photos-v2-view"

vi.mock("next/image", () => ({
  default: ({ alt, fill, ...props }: { alt?: string; fill?: boolean }) => (
    <img alt={String(alt ?? "")} data-fill={fill ? "true" : undefined} {...props} />
  ),
}))
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mockProjectData = vi.hoisted(() => vi.fn())
const mockProjectExpenses = vi.hoisted(() => vi.fn())
vi.mock("@/lib/hooks", () => ({ useProjectData: () => mockProjectData() }))
vi.mock("@/lib/hooks/useProjectExpenses", () => ({ useProjectExpenses: () => mockProjectExpenses() }))
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => vi.fn(),
  useLiff: () => ({ user: { id: "u1" } }),
}))

import { PhotosV2 } from "@/components/v2/photos/photos-v2"

const expenses: PhotoExpense[] = [
  { id: "e1", image: "/a.jpg", amount: 1280, currency: "TWD", description: "一蘭拉麵晚餐", category: "food", location: "新宿", expenseDate: "2026-10-18", payers: [{ memberId: "m1", amount: 1280, member: { displayName: "志明" } }] },
  { id: "e2", image: "/b.jpg", amount: 14000, currency: "TWD", description: null, category: "accommodation", location: null, expenseDate: "2026-10-19", payers: [{ memberId: "m2", amount: 14000, member: { displayName: "小美" } }] },
  { id: "e3", image: null, amount: 100, currency: "TWD", description: "無照片", category: "transport", location: null, expenseDate: "2026-10-20", payers: [{ memberId: "m1", amount: 100, member: { displayName: "志明" } }] },
]

function renderView(overrides: Partial<Parameters<typeof PhotosV2View>[0]> = {}) {
  const props: Parameters<typeof PhotosV2View>[0] = {
    projectId: "p1",
    currency: "TWD",
    expenses,
    loading: false,
    ...overrides,
  }
  return render(<PhotosV2View {...props} />)
}

describe("PhotosV2View", () => {
  it("counts only expenses with a photo and lists tiles", () => {
    renderView()
    expect(screen.getByText("2 張收據照片")).toBeInTheDocument()
    expect(screen.getByTestId("photo-tile-e1")).toBeInTheDocument()
    expect(screen.getByTestId("photo-tile-e2")).toBeInTheDocument()
    expect(screen.queryByTestId("photo-tile-e3")).not.toBeInTheDocument()
    expect(screen.getByTestId("category-chip-food")).toHaveTextContent("餐飲 1")
    expect(screen.getByTestId("category-chip-accommodation")).toHaveTextContent("住宿 1")
  })

  it("opens the lightbox and links to edit", () => {
    renderView()
    fireEvent.click(screen.getByTestId("photo-tile-e1"))
    expect(screen.getByTestId("photo-lightbox")).toBeInTheDocument()
    expect(screen.getByTestId("photo-counter")).toHaveTextContent("1 / 2")
    expect(screen.getByRole("link", { name: "查看" })).toHaveAttribute("href", "/projects/p1/expenses/e1/edit")
  })

  it("navigates with the keyboard and wraps around", () => {
    renderView()
    fireEvent.click(screen.getByTestId("photo-tile-e1"))
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(screen.getByTestId("photo-counter")).toHaveTextContent("2 / 2")
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(screen.getByTestId("photo-counter")).toHaveTextContent("1 / 2")
    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(screen.getByTestId("photo-counter")).toHaveTextContent("2 / 2")
  })

  it("closes with Escape", () => {
    renderView()
    fireEvent.click(screen.getByTestId("photo-tile-e1"))
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByTestId("photo-lightbox")).not.toBeInTheDocument()
  })

  it("filters by category", () => {
    renderView()
    fireEvent.click(screen.getByTestId("category-chip-food"))
    expect(screen.getByTestId("photo-tile-e1")).toBeInTheDocument()
    expect(screen.queryByTestId("photo-tile-e2")).not.toBeInTheDocument()
  })

  it("shows the empty state when there are no photos", () => {
    renderView({ expenses: [expenses[2]] })
    expect(screen.getByText("還沒有照片")).toBeInTheDocument()
    expect(screen.queryByTestId("photo-lightbox")).not.toBeInTheDocument()
  })

  it("shows location in the lightbox", () => {
    renderView()
    fireEvent.click(screen.getByTestId("photo-tile-e1"))
    expect(screen.getByText(/新宿/)).toBeInTheDocument()
  })

  it("shows a compact multi-payer label in the lightbox", () => {
    const multi: PhotoExpense = {
      ...expenses[0],
      id: "e9",
      image: "/c.jpg",
      payers: [
        { memberId: "m1", amount: 280, member: { displayName: "志明" } },
        { memberId: "m2", amount: 1000, member: { displayName: "小美" } },
      ],
    }
    renderView({ expenses: [multi] })
    fireEvent.click(screen.getByTestId("photo-tile-e9"))
    expect(screen.getByText(/小美等 2 人/)).toBeInTheDocument()
  })

  it("navigates with the on-screen arrows and closes", () => {
    renderView()
    fireEvent.click(screen.getByTestId("photo-tile-e1"))
    fireEvent.click(screen.getByRole("button", { name: "下一張" }))
    expect(screen.getByTestId("photo-counter")).toHaveTextContent("2 / 2")
    fireEvent.click(screen.getByRole("button", { name: "上一張" }))
    expect(screen.getByTestId("photo-counter")).toHaveTextContent("1 / 2")
    fireEvent.click(screen.getByRole("button", { name: "關閉" }))
    expect(screen.queryByTestId("photo-lightbox")).not.toBeInTheDocument()
  })

  it("closes the lightbox when the filter empties it (Review Focus 3)", async () => {
    const { rerender } = renderView()
    fireEvent.click(screen.getByTestId("photo-tile-e1"))
    expect(screen.getByTestId("photo-lightbox")).toBeInTheDocument()
    rerender(<PhotosV2View projectId="p1" currency="TWD" expenses={[expenses[2]]} loading={false} />)
    await waitFor(() => expect(screen.queryByTestId("photo-lightbox")).not.toBeInTheDocument())
  })
})

describe("PhotosV2 container", () => {
  beforeEach(() => {
    mockProjectData.mockReset().mockReturnValue({ project: { name: "京都", currency: "TWD" }, members: [], loading: false })
    mockProjectExpenses.mockReset().mockReturnValue({ expenses, loading: false })
  })

  it("renders the photos page", () => {
    render(<PhotosV2 projectId="p1" />)
    expect(screen.getByRole("heading", { name: "照片牆" })).toBeInTheDocument()
    expect(screen.getByText("2 張收據照片")).toBeInTheDocument()
  })

  it("shows a skeleton while loading", () => {
    mockProjectData.mockReturnValue({ project: null, members: [], loading: true })
    mockProjectExpenses.mockReturnValue({ expenses: [], loading: true })
    render(<PhotosV2 projectId="p1" />)
    expect(screen.getByTestId("v2-photos-skeleton")).toBeInTheDocument()
  })
})
