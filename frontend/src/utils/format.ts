const ratingFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

/** 4 -> "4", 4.333 -> "4.33". */
export function formatRating(value: number): string {
  return ratingFormat.format(value)
}
