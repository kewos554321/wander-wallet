"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import "react-day-picker/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background p-3 [--cell-size:--spacing(9)]",
        "[[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        className
      )}
      classNames={{
        months: "flex flex-col gap-4 md:flex-row",
        month: "space-y-2",
        caption: "flex justify-center items-center h-9",
        nav: "flex items-center gap-1",
        nav_button:
          "size-8 p-0 bg-transparent hover:bg-accent text-foreground rounded-md aria-disabled:opacity-50",
        table: "w-full border-collapse",
        head_row: "flex",
        row: "mt-1 flex w-full",
        cell: "relative p-0 text-center text-sm",
        day: cn(
          "size-(--cell-size) leading-none rounded-md",
          "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none",
          "aria-selected:opacity-100"
        ),
        day_selected: "bg-primary text-primary-foreground",
        day_range_start: "bg-primary text-primary-foreground",
        day_range_end: "bg-primary text-primary-foreground",
        day_range_middle: "bg-accent",
        day_today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      {...props}
    />
  )
}


