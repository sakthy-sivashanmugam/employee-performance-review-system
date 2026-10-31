/** Empty in development: requests go to /api on the Vite server, which proxies to the backend. */
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

const UNREACHABLE_MESSAGE = 'Cannot reach the server. Check that the backend is running.'

/** Messages for individual input fields, keyed by the backend's field name (e.g. "email"). */
export type FieldErrors = Record<string, string>

/** An error from the API or the network, with a message that is safe to show to the user. */
export class ApiError extends Error {
  status: number
  /** Set when the backend says which field is wrong (a 409 conflict or a 422 validation error). */
  fieldErrors: FieldErrors

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
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

/**
 * Turns an error response into an ApiError. FastAPI sends {"detail": "message"} for handled
 * errors (a 409 conflict starts with the field name, e.g. "email 'a@b.c' already exists") and
 * {"detail": [{"loc": ["body", "<field>"], "msg": "..."}]} for validation errors.
 */
async function readError(response: Response): Promise<ApiError> {
  const { status } = response
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') {
      const field = status === 409 ? /^([a-z_]+) '/.exec(body.detail)?.[1] : undefined
      return new ApiError(body.detail, status, field ? { [field]: body.detail } : {})
    }
    if (Array.isArray(body?.detail)) {
      const fieldErrors: FieldErrors = {}
      for (const item of body.detail) {
        const field = Array.isArray(item?.loc) ? item.loc[1] : undefined
        if (typeof field === 'string' && typeof item?.msg === 'string' && !(field in fieldErrors)) {
          fieldErrors[field] = item.msg
        }
      }
      return new ApiError('The request was not valid.', status, fieldErrors)
    }
  } catch {
    // The body was not JSON; fall through to the generic message.
  }
  // In development the Vite proxy answers 502 (and similar) when the backend is not running.
  if ([502, 503, 504].includes(status)) return new ApiError(UNREACHABLE_MESSAGE, status)
  return new ApiError(`Request failed (${status}).`, status)
}

async function request<T>(
  path: string,
  options: { params?: QueryParams; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const init: RequestInit = { headers: { Accept: 'application/json' }, signal: options.signal }
  if (options.body !== undefined) {
    init.method = 'POST'
    init.headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
    init.body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(options.params)}`, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(UNREACHABLE_MESSAGE, 0)
  }
  if (!response.ok) throw await readError(response)
  return (await response.json()) as T
}

/** GET a JSON resource from the backend. Pass an AbortSignal to cancel the request. */
export function apiGet<T>(
  path: string,
  options: { params?: QueryParams; signal?: AbortSignal } = {},
): Promise<T> {
  return request<T>(path, options)
}

/** POST a JSON body to the backend and return the JSON response. */
export function apiPost<T>(path: string, body: unknown, options: { signal?: AbortSignal } = {}): Promise<T> {
  return request<T>(path, { body, signal: options.signal })
}
