import type { ReactNode } from "react"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { DemoShell } from "@/components/demo/demo-shell"

// One v2 scope for the whole /demo area; individual pages do not wrap again.
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <UiV2Scope>
      <DemoShell>{children}</DemoShell>
    </UiV2Scope>
  )
}
