"use client"

import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const cycle = React.useCallback(() => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")
  }, [theme, setTheme])

  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setTheme("light")}>Light</Button>
      <Button variant="outline" size="sm" onClick={() => setTheme("dark")}>Dark</Button>
      <Button variant="outline" size="sm" onClick={() => setTheme("system")}>System</Button>
      <Button variant="default" size="sm" onClick={cycle}>Toggle ({label})</Button>
    </div>
  )
}
