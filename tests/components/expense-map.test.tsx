import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"
import L from "leaflet"

// Mock Leaflet - must be defined before vi.mock
vi.mock("leaflet", () => {
  const mockSetView = vi.fn().mockReturnThis()
  const mockRemove = vi.fn()
  const mockAddTo = vi.fn().mockReturnThis()
  const mockFitBounds = vi.fn()
  const mockBindPopup = vi.fn().mockReturnThis()
  const mockOn = vi.fn().mockReturnThis()
  const mockGetBounds = vi.fn().mockReturnValue({
    pad: vi.fn().mockReturnValue({}),
  })

  const mockMarker = {
    addTo: mockAddTo,
    bindPopup: mockBindPopup,
    on: mockOn,
  }

  const mockMap = {
    setView: mockSetView,
    remove: mockRemove,
    fitBounds: mockFitBounds,
  }

  const mockTileLayer = {
    addTo: mockAddTo,
  }

  const mockFeatureGroup = vi.fn().mockReturnValue({
    getBounds: mockGetBounds,
  })

  return {
    default: {
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => mockTileLayer),
      marker: vi.fn(() => mockMarker),
      featureGroup: mockFeatureGroup,
      divIcon: vi.fn(() => ({})),
    },
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => mockTileLayer),
    marker: vi.fn(() => mockMarker),
    featureGroup: mockFeatureGroup,
    divIcon: vi.fn(() => ({})),
  }
})

// Mock the CSS import
vi.mock("leaflet/dist/leaflet.css", () => ({}))

import { ExpenseMap, MAP_STYLES, type MapStyle } from "@/components/map/expense-map"

describe("ExpenseMap Component", () => {
  const mockExpenses = [
    {
      id: "expense-1",
      amount: 350,
      currency: "TWD",
      description: "午餐拉麵",
      category: "food",
      location: "東京車站",
      latitude: 35.6812,
      longitude: 139.7671,
      expenseDate: "2024-12-01",
      payers: [
        { memberId: "m1", displayName: "小明" },
        { memberId: "m2", displayName: "小華" },
      ],
    },
    {
      id: "expense-2",
      amount: 500,
      currency: "TWD",
      description: "計程車",
      category: "transport",
      location: "新宿",
      latitude: 35.6896,
      longitude: 139.6917,
      expenseDate: "2024-12-01",
      payers: [{ memberId: "m3", displayName: "小華" }],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("rendering", () => {
    it("should render map container", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" />
      )

      expect(container.querySelector("div")).toBeInTheDocument()
    })

    it("joins every payer's name in the marker popup", () => {
      render(<ExpenseMap expenses={mockExpenses} projectCurrency="TWD" />)

      const markerFactory = vi.mocked(L.marker)
      const bindPopup = (markerFactory.mock.results[0]?.value as { bindPopup: ReturnType<typeof vi.fn> }).bindPopup
      const html = bindPopup.mock.calls[0][0] as string

      expect(html).toContain("小明、小華")
    })

    it("should have minimum height style", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" />
      )

      const mapDiv = container.firstChild as HTMLElement
      expect(mapDiv.style.minHeight).toBe("400px")
    })

    it("should have rounded corners class", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" />
      )

      const mapDiv = container.firstChild as HTMLElement
      expect(mapDiv.className).toContain("rounded-xl")
    })
  })

  describe("coordinate normalization", () => {
    it("computes a finite center when coordinates arrive as numeric strings", () => {
      // Prisma Decimal fields arrive from the API as JSON strings.
      const stringyExpenses = mockExpenses.map((e) => ({
        ...e,
        latitude: String(e.latitude) as unknown as number,
        longitude: String(e.longitude) as unknown as number,
      }))

      render(<ExpenseMap expenses={stringyExpenses} projectCurrency="TWD" />)

      const mapInstance = vi.mocked(L.map).mock.results.at(-1)?.value as { setView: ReturnType<typeof vi.fn> }
      expect(mapInstance.setView).toHaveBeenCalled()
      const center = mapInstance.setView.mock.calls[0][0] as unknown[]
      expect(center).toHaveLength(2)
      expect(center.every((value) => Number.isFinite(value))).toBe(true)
    })
  })

  describe("map lifecycle", () => {
    it("disables zoom animation to avoid orphaned transition callbacks on removal", () => {
      render(<ExpenseMap expenses={mockExpenses} projectCurrency="TWD" />)

      expect(vi.mocked(L.map)).toHaveBeenCalledWith(expect.anything(), { zoomAnimation: false })
      const mapInstance = vi.mocked(L.map).mock.results.at(-1)?.value as { fitBounds: ReturnType<typeof vi.fn> }
      expect(mapInstance.fitBounds).toHaveBeenCalledWith(expect.anything(), { animate: false })
    })

    it("does not rebuild the map when only the click handler identity changes", () => {
      const { rerender } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" onExpenseClick={vi.fn()} />
      )
      expect(vi.mocked(L.map)).toHaveBeenCalledTimes(1)

      rerender(<ExpenseMap expenses={mockExpenses} projectCurrency="TWD" onExpenseClick={vi.fn()} />)
      expect(vi.mocked(L.map)).toHaveBeenCalledTimes(1)
    })
  })

  describe("with empty expenses", () => {
    it("should render with empty expenses array", () => {
      const { container } = render(
        <ExpenseMap expenses={[]} projectCurrency="TWD" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe("with expenses without coordinates", () => {
    it("should filter out expenses without valid coordinates", () => {
      const expensesWithInvalidCoords = [
        {
          id: "expense-1",
          amount: 350,
          currency: "TWD",
          description: "午餐拉麵",
          category: "food",
          location: null,
          latitude: 0,
          longitude: 0,
          expenseDate: "2024-12-01",
          payers: [{ memberId: "m1", displayName: "小明" }],
        },
      ]

      const { container } = render(
        <ExpenseMap expenses={expensesWithInvalidCoords} projectCurrency="TWD" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe("map styles", () => {
    it("should accept default mapStyle prop", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" mapStyle="watercolor" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it("should accept standard mapStyle", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" mapStyle="standard" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it("should accept voyager mapStyle", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" mapStyle="voyager" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it("should accept toner mapStyle", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="TWD" mapStyle="toner" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe("onExpenseClick callback", () => {
    it("should accept onExpenseClick prop", () => {
      const onExpenseClick = vi.fn()

      const { container } = render(
        <ExpenseMap
          expenses={mockExpenses}
          projectCurrency="TWD"
          onExpenseClick={onExpenseClick}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe("different currencies", () => {
    it("should render with JPY currency", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="JPY" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it("should render with USD currency", () => {
      const { container } = render(
        <ExpenseMap expenses={mockExpenses} projectCurrency="USD" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe("different expense categories", () => {
    it("should handle all category types", () => {
      const expensesWithAllCategories = [
        { ...mockExpenses[0], category: "food" },
        { ...mockExpenses[0], id: "2", category: "transport" },
        { ...mockExpenses[0], id: "3", category: "accommodation" },
        { ...mockExpenses[0], id: "4", category: "ticket" },
        { ...mockExpenses[0], id: "5", category: "shopping" },
        { ...mockExpenses[0], id: "6", category: "entertainment" },
        { ...mockExpenses[0], id: "7", category: "gift" },
        { ...mockExpenses[0], id: "8", category: "other" },
        { ...mockExpenses[0], id: "9", category: null },
      ]

      const { container } = render(
        <ExpenseMap expenses={expensesWithAllCategories} projectCurrency="TWD" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe("expense with null description", () => {
    it("should handle null description", () => {
      const expensesWithNullDescription = [
        {
          ...mockExpenses[0],
          description: null,
        },
      ]

      const { container } = render(
        <ExpenseMap expenses={expensesWithNullDescription} projectCurrency="TWD" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

describe("MAP_STYLES", () => {
  it("should have standard style", () => {
    expect(MAP_STYLES.standard).toBeDefined()
    expect(MAP_STYLES.standard.name).toBe("標準")
    expect(MAP_STYLES.standard.emoji).toBe("🗺️")
    expect(MAP_STYLES.standard.url).toContain("openstreetmap")
  })

  it("should have watercolor style", () => {
    expect(MAP_STYLES.watercolor).toBeDefined()
    expect(MAP_STYLES.watercolor.name).toBe("衛星圖")
    expect(MAP_STYLES.watercolor.emoji).toBe("🛰️")
    expect(MAP_STYLES.watercolor.url).toContain("arcgisonline")
  })

  it("should have voyager style", () => {
    expect(MAP_STYLES.voyager).toBeDefined()
    expect(MAP_STYLES.voyager.name).toBe("繽紛風")
    expect(MAP_STYLES.voyager.emoji).toBe("🌈")
    expect(MAP_STYLES.voyager.url).toContain("voyager")
  })

  it("should have toner style", () => {
    expect(MAP_STYLES.toner).toBeDefined()
    expect(MAP_STYLES.toner.name).toBe("極簡風")
    expect(MAP_STYLES.toner.emoji).toBe("✏️")
    expect(MAP_STYLES.toner.url).toContain("light_all")
  })

  it("should have all 4 styles", () => {
    const styles = Object.keys(MAP_STYLES)
    expect(styles).toHaveLength(4)
    expect(styles).toContain("standard")
    expect(styles).toContain("watercolor")
    expect(styles).toContain("voyager")
    expect(styles).toContain("toner")
  })
})

describe("MapStyle type", () => {
  it("should accept valid map style types", () => {
    const validStyles: MapStyle[] = ["standard", "watercolor", "voyager", "toner"]
    expect(validStyles).toHaveLength(4)
  })
})

describe("exports", () => {
  it("should export ExpenseMap component", () => {
    expect(ExpenseMap).toBeDefined()
    expect(typeof ExpenseMap).toBe("function")
  })

  it("should export MAP_STYLES constant", () => {
    expect(MAP_STYLES).toBeDefined()
    expect(typeof MAP_STYLES).toBe("object")
  })
})
