import { ApiError, apiGet } from './client'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiGet', () => {
  it('returns the parsed JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiGet('/api/employees')).resolves.toEqual([{ id: 1 }])
    expect(fetchMock).toHaveBeenCalledWith('/api/employees', expect.objectContaining({
      headers: { Accept: 'application/json' },
    }))
  })

  it('adds query parameters and skips undefined ones', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await apiGet('/api/reviews', { params: { employee_id: 3, department: undefined, status: 'Open' } })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/reviews?employee_id=3&status=Open')
  })

  it('uses the "detail" message from the backend for errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Employee 9 not found' }, 404)))

    const error = await apiGet('/api/employees/9').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Employee 9 not found')
    expect((error as ApiError).status).toBe(404)
  })

  it('gives a generic message for validation errors and non-JSON errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: [{ msg: 'bad' }] }, 422)))
    await expect(apiGet('/api/reviews')).rejects.toThrow('The request was not valid.')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>oops</html>', { status: 500 })))
    await expect(apiGet('/api/reviews')).rejects.toThrow('Request failed (500).')
  })

  it.each([502, 503, 504])('explains a gateway error (%i) as the backend not running', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status })))

    const error = await apiGet('/api/employees').catch((e: unknown) => e)

    expect((error as ApiError).message).toMatch(/Cannot reach the server/)
    expect((error as ApiError).status).toBe(status)
  })

  it('explains a network failure in plain language', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await apiGet('/api/employees').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toMatch(/Cannot reach the server/)
    expect((error as ApiError).status).toBe(0)
  })

  it('passes cancellation through unchanged', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))

    await expect(apiGet('/api/employees')).rejects.toBe(abort)
  })
})
