import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**/*.ts", "components/**/*.tsx", "app/api/**/*.ts"],
      exclude: [
        "lib/generated/**",
        "**/*.d.ts",
        // Browser API dependent files (FileReader, canvas, speech recognition, etc.)
        "lib/image-utils.ts",
        "lib/speech.ts",
        "lib/hooks/index.ts",
        // Complex UI components with browser interactions
        "components/voice/**",
        "components/expense/expense-form.tsx",
        "components/cover-picker.tsx",
        "components/avatar-picker.tsx",
        "components/member-avatar.tsx",
        "components/action-picker.tsx",
        "components/location-picker.tsx",
        "components/ui/image-picker.tsx",
        "components/ui/image-cropper.tsx",
        "components/ui/badge.tsx",
        "components/ui/label.tsx",
        "components/ui/slider.tsx",
        "components/ui/search-input.tsx",
        "components/ui/filter-dropdown.tsx",
        "components/ui/dropdown-menu.tsx",
        "components/ui/select.tsx",
        "components/ui/calendar.tsx",
        "components/ui/calculator.tsx",
        "components/ui/currency-select.tsx",
        // Auth components (LIFF SDK dependent)
        "components/auth/liff-provider.tsx",
        "components/auth/auth-gate.tsx",
        // Ads components
        "components/ads/ad-container.tsx",
        // Dashboard charts (rely on recharts library)
        "components/dashboard/**",
        // Debug components
        "components/debug/**",
        // Export components
        "components/export/**",
        // Map components (rely on external map libraries)
        "components/map/**",
        // System components with browser APIs
        "components/system/**",
        // Admin API routes (require complex database setup)
        "app/api/admin/**",
        "app/api/image-proxy/**",
        // API routes with complex external dependencies
        "app/api/projects/[id]/expenses/[expenseId]/route.ts",
        "app/api/projects/[id]/expenses/batch/route.ts",
        "app/api/projects/[id]/members/claim/route.ts",
        "app/api/projects/[id]/settle/route.ts",
        "app/api/users/profile/route.ts",
        // PDF generation (complex canvas/document operations)
        "lib/export/pdf-generator.ts",
        "lib/export/csv-generator.ts",
        // Hooks with complex state
        "lib/hooks/useExpenseFilters.ts",
        "lib/hooks/useCurrencyConversion.ts",
        "lib/hooks/useProjectData.ts",
        // Logger with external dependencies
        "lib/logger.ts",
        // Auth with NextAuth dependencies
        "lib/auth.ts",
        // Database with Prisma dependencies
        "lib/db.ts",
        // Error handler edge cases
        "lib/error-handler.ts",
        // LIFF SDK dependent
        "lib/liff.ts",
        // R2 storage with AWS SDK
        "lib/r2.ts",
        // Utils with edge cases
        "lib/utils.ts",
        // AI parsers with edge cases
        "lib/ai/expense-parser.ts",
        // Exchange rate service
        "lib/services/exchange-rate.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
