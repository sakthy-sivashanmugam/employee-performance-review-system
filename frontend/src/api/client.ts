/** Empty in development: requests go to /api on the Vite server, which proxies to the backend. */
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

const UNREACHABLE_MESSAGE = 'Cannot reach the server. Check that the backend is running.'

/** An error from the API or the network, with a message that is safe to show to the user. */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryParams = Record<string, string | number | undefined>

function buildQuery(params?: QueryParams): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    // FastAPI sends {"detail": "message"} for handled errors and a list for validation errors.
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) return 'The request was not valid.'
  } catch {
    // The body was not JSON; fall through to the generic message.
  }
  // In development the Vite proxy answers 502 (and similar) when the backend is not running.
  if ([502, 503, 504].includes(response.status)) return UNREACHABLE_MESSAGE
  return `Request failed (${response.status}).`
}

/** GET a JSON resource from the backend. Pass an AbortSignal to cancel the request. */
export async function apiGet<T>(
  path: string,
  options: { params?: QueryParams; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(options.params)}`, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(UNREACHABLE_MESSAGE, 0)
  }
  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status)
  return (await response.json()) as T
}
