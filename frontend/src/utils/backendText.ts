// Helpers that treat text the way the backend does, so forms judge input the same way it will.

// The characters the backend strips from both ends of text: the Unicode "White_Space" property.
// JavaScript's own trim() is slightly different (it also strips U+FEFF and not U+0085), so using
// it would make a form disagree with the backend on those two rare characters.
const BACKEND_WHITESPACE = '\\t-\\r \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'
const EDGE_WHITESPACE = new RegExp(`^[${BACKEND_WHITESPACE}]+|[${BACKEND_WHITESPACE}]+$`, 'g')

/** Removes spaces from both ends of a value exactly as the backend does. */
export function trimLikeBackend(text: string): string {
  return text.replace(EDGE_WHITESPACE, '')
}

/** Counts characters the way the backend does (one per character, even for emoji). */
export function characterCount(text: string): number {
  return Array.from(text).length
}
