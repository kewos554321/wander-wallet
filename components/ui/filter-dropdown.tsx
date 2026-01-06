"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface FilterDropdownProps {
  label: string
  icon?: React.ReactNode
  activeCount?: number
  children: React.ReactNode
  align?: "start" | "center" | "end"
  contentClassName?: string
  className?: string
}

export function FilterDropdown({
  label,
  icon,
  activeCount,
  children,
  align = "start",
  contentClassName,
  className,
}: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("w-full justify-between", className)}
        >
          <span className="flex items-center gap-1.5">
            {icon}
            {label}
            {activeCount !== undefined && activeCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {activeCount}
              </span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("w-48", contentClassName)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
