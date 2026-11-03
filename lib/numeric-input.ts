/**
 * Keep digits and a single decimal point; drop everything else. Used by the
 * numeric fields (rate input, trip budget) so a user can only type a number.
 */
export function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "")
  const firstDot = cleaned.indexOf(".")
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "")
}
