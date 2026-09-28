// Local-date helpers shared by v2 date-range pickers (new trip, project
// settings). Dates are stored as yyyy-MM-dd strings; parsing/formatting stays
// in local time to avoid UTC off-by-one drift, matching the v1 behavior.

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function isoToLocalDate(isoStr: string): string {
  return formatLocalDate(new Date(isoStr))
}

// yyyy-MM-dd -> yyyy/MM/dd, for the v2 display format.
export function slashDate(dateStr: string): string {
  return dateStr.replaceAll("-", "/")
}
