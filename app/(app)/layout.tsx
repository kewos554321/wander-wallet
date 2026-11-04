import type { ReactNode } from "react"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"

/**
 * Product-route shell. Every page under `app/(app)` gets the v2 token scope and
 * fonts once, so individual screens and overlays cannot drift out of the design
 * system by forgetting a wrapper.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <UiV2Scope>{children}</UiV2Scope>
}
