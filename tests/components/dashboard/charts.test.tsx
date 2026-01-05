import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BalanceBarChart } from "@/components/dashboard/balance-bar-chart"
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart"
import { CategoryTrendChart } from "@/components/dashboard/category-trend-chart"
import { TrendAreaChart } from "@/components/dashboard/trend-area-chart"

// Mock recharts to avoid SSR/DOM issues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
}))

describe("BalanceBarChart Component", () => {
  const mockData = [
    { name: "小明", paid: 1000, share: 800, balance: 200 },
    { name: "小華", paid: 500, share: 800, balance: -300 },
    { name: "小美", paid: 900, share: 800, balance: 100 },
  ]

  describe("rendering", () => {
    it("should render chart title", () => {
      render(<BalanceBarChart data={mockData} />)

      expect(screen.getByText("成員付款比較")).toBeInTheDocument()
    })

    it("should render legend items", () => {
      render(<BalanceBarChart data={mockData} />)

      expect(screen.getByText("已付金額")).toBeInTheDocument()
      expect(screen.getByText("應付金額")).toBeInTheDocument()
    })

    it("should render responsive container", () => {
      render(<BalanceBarChart data={mockData} />)

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
    })

    it("should render bar chart", () => {
      render(<BalanceBarChart data={mockData} />)

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
    })
  })

  describe("props", () => {
    it("should accept custom height", () => {
      render(<BalanceBarChart data={mockData} height={200} />)

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
    })

    it("should accept currency prop", () => {
      render(<BalanceBarChart data={mockData} currency="USD" />)

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
    })

    it("should handle empty data", () => {
      render(<BalanceBarChart data={[]} />)

      expect(screen.getByText("成員付款比較")).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export BalanceBarChart component", () => {
      expect(BalanceBarChart).toBeDefined()
      expect(typeof BalanceBarChart).toBe("function")
    })
  })
})

describe("CategoryPieChart Component", () => {
  const mockData = [
    { name: "food", value: 500, color: "#ef4444" },
    { name: "transport", value: 300, color: "#3b82f6" },
    { name: "accommodation", value: 200, color: "#22c55e" },
  ]

  describe("rendering", () => {
    it("should render chart title", () => {
      render(<CategoryPieChart data={mockData} />)

      expect(screen.getByText("分類統計")).toBeInTheDocument()
    })

    it("should render responsive container", () => {
      render(<CategoryPieChart data={mockData} />)

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
    })

    it("should render pie chart", () => {
      render(<CategoryPieChart data={mockData} />)

      expect(screen.getByTestId("pie-chart")).toBeInTheDocument()
    })

    it("should render category labels", () => {
      render(<CategoryPieChart data={mockData} />)

      // These are translated by getCategoryLabel
      expect(screen.getByText("餐飲")).toBeInTheDocument()
      expect(screen.getByText("交通")).toBeInTheDocument()
      expect(screen.getByText("住宿")).toBeInTheDocument()
    })

    it("should render percentage labels", () => {
      render(<CategoryPieChart data={mockData} />)

      // Total is 1000, so: food=50%, transport=30%, accommodation=20%
      expect(screen.getByText("50%")).toBeInTheDocument()
      expect(screen.getByText("30%")).toBeInTheDocument()
      expect(screen.getByText("20%")).toBeInTheDocument()
    })
  })

  describe("props", () => {
    it("should accept currency prop", () => {
      render(<CategoryPieChart data={mockData} currency="JPY" />)

      expect(screen.getByTestId("pie-chart")).toBeInTheDocument()
    })

    it("should handle empty data", () => {
      render(<CategoryPieChart data={[]} />)

      expect(screen.getByText("分類統計")).toBeInTheDocument()
    })

    it("should handle data with zero total", () => {
      const zeroData = [
        { name: "food", value: 0, color: "#ef4444" },
      ]

      render(<CategoryPieChart data={zeroData} />)

      // Should show 0% when total is 0
      expect(screen.getByText("0%")).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export CategoryPieChart component", () => {
      expect(CategoryPieChart).toBeDefined()
      expect(typeof CategoryPieChart).toBe("function")
    })
  })
})

describe("CategoryTrendChart Component", () => {
  const mockData = [
    { date: "1/1", food: 100, transport: 50 },
    { date: "1/2", food: 200, transport: 100 },
    { date: "1/3", food: 150, transport: 75 },
  ]
  const categories = ["food", "transport"]

  describe("rendering", () => {
    it("should render chart title", () => {
      render(<CategoryTrendChart data={mockData} categories={categories} />)

      expect(screen.getByText("類別趨勢")).toBeInTheDocument()
    })

    it("should render area chart", () => {
      render(<CategoryTrendChart data={mockData} categories={categories} />)

      expect(screen.getByTestId("area-chart")).toBeInTheDocument()
    })

    it("should render category legends", () => {
      render(<CategoryTrendChart data={mockData} categories={categories} />)

      expect(screen.getByText("餐飲")).toBeInTheDocument()
      expect(screen.getByText("交通")).toBeInTheDocument()
    })

    it("should return null when data has less than 2 points", () => {
      const { container } = render(
        <CategoryTrendChart data={[{ date: "1/1", food: 100 }]} categories={["food"]} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe("props", () => {
    it("should accept currency prop", () => {
      render(<CategoryTrendChart data={mockData} categories={categories} currency="JPY" />)

      expect(screen.getByTestId("area-chart")).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export CategoryTrendChart component", () => {
      expect(CategoryTrendChart).toBeDefined()
      expect(typeof CategoryTrendChart).toBe("function")
    })
  })
})

describe("TrendAreaChart Component", () => {
  const mockData = [
    { date: "1/1", amount: 1000 },
    { date: "1/2", amount: 1500 },
    { date: "1/3", amount: 800 },
  ]

  describe("rendering", () => {
    it("should render chart title", () => {
      render(<TrendAreaChart data={mockData} />)

      expect(screen.getByText("消費趨勢")).toBeInTheDocument()
    })

    it("should render area chart", () => {
      render(<TrendAreaChart data={mockData} />)

      expect(screen.getByTestId("area-chart")).toBeInTheDocument()
    })

    it("should render info button", () => {
      render(<TrendAreaChart data={mockData} />)

      // Info button exists
      const button = screen.getByRole("button")
      expect(button).toBeInTheDocument()
    })
  })

  describe("props", () => {
    it("should accept height prop", () => {
      render(<TrendAreaChart data={mockData} height={200} />)

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
    })

    it("should accept currency prop", () => {
      render(<TrendAreaChart data={mockData} currency="USD" />)

      expect(screen.getByTestId("area-chart")).toBeInTheDocument()
    })
  })

  describe("exports", () => {
    it("should export TrendAreaChart component", () => {
      expect(TrendAreaChart).toBeDefined()
      expect(typeof TrendAreaChart).toBe("function")
    })
  })
})
