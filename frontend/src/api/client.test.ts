import { ApiError, apiGet, apiPost } from './client'
import { createEmployee } from './employees'

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

describe('apiPost', () => {
  it('sends the body as JSON with the POST method and returns the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 6 }, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiPost('/api/employees', { name: 'A' })).resolves.toEqual({ id: 6 })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/employees')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ name: 'A' }))
    expect(init.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json' })
  })

  it('reads the field from a 409 conflict message', async () => {
    const detail = "employee_code 'EMP101' already exists"
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail }, 409)))

    const error = (await apiPost('/api/employees', {}).catch((e: unknown) => e)) as ApiError

    expect(error.status).toBe(409)
    expect(error.message).toBe(detail)
    expect(error.fieldErrors).toEqual({ employee_code: detail })
  })

  it('reads the field from an email conflict too', async () => {
    const detail = "email 'a@corp.test' already exists"
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail }, 409)))

    const error = (await apiPost('/api/employees', {}).catch((e: unknown) => e)) as ApiError

    expect(error.fieldErrors).toEqual({ email: detail })
  })

  it('has no field errors for messages that do not name a field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Something else' }, 409)))
    const conflict = (await apiPost('/api/x', {}).catch((e: unknown) => e)) as ApiError
    expect(conflict.fieldErrors).toEqual({})

    // Only a 409 is read for field names: a 500 with a similar message must not point at a field.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: "email 'x' broke" }, 500)))
    const serverError = (await apiPost('/api/x', {}).catch((e: unknown) => e)) as ApiError
    expect(serverError.fieldErrors).toEqual({})
  })

  it('maps 422 validation errors to their fields (the first message for each)', async () => {
    const detail = [
      { loc: ['body', 'name'], msg: 'String should have at least 1 character' },
      { loc: ['body', 'name'], msg: 'a second message for the same field' },
      { loc: ['body', 'employee_code'], msg: 'String should match pattern' },
      { loc: ['body'], msg: 'whole body problem' },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail }, 422)))

    const error = (await apiPost('/api/employees', {}).catch((e: unknown) => e)) as ApiError

    expect(error.status).toBe(422)
    expect(error.message).toBe('The request was not valid.')
    expect(error.fieldErrors).toEqual({
      name: 'String should have at least 1 character',
      employee_code: 'String should match pattern',
    })
  })

  it('explains a network failure, and passes cancellation through', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(apiPost('/api/employees', {})).rejects.toThrow(/Cannot reach the server/)

    const abort = new DOMException('aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    await expect(apiPost('/api/employees', {})).rejects.toBe(abort)
  })
})

describe('createEmployee', () => {
  it('posts exactly the four employee fields to /api/employees', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 6 }, 201))
    vi.stubGlobal('fetch', fetchMock)
    const data = { employee_code: 'EMP106', name: 'Chris Bell', department: 'Finance', email: 'chris@corp.test' }

    await createEmployee(data)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/employees')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(data)
  })

  it('leaves GET requests as they were: no method and no body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await apiGet('/api/employees')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init).not.toHaveProperty('method')
    expect(init).not.toHaveProperty('body')
  })
})

describe('review API functions', () => {
  it('lists only Active employees and only Open periods, using the backend status filter', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    const { listActiveEmployees } = await import('./employees')
    const { listOpenReviewPeriods } = await import('./reviewPeriods')
    await listActiveEmployees()
    await listOpenReviewPeriods()

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/employees?status=Active',
      '/api/review-periods?status=Open',
    ])
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(init).not.toHaveProperty('method')
      expect(init).not.toHaveProperty('body')
    }
  })

  it('posts exactly the six review fields, with no average and no time', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1, average_rating: 4.33 }, 201))
    vi.stubGlobal('fetch', fetchMock)
    const data = {
      employee_id: 1,
      review_period_id: 2,
      quality_of_work: 4,
      delivery_ownership: 5,
      teamwork_collaboration: 4,
      comments: 'Strong quarter.',
    }

    const { createReview } = await import('./reviews')
    await expect(createReview(data)).resolves.toMatchObject({ average_rating: 4.33 })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/reviews')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(data)
    expect(Object.keys(JSON.parse(init.body as string)).sort()).toEqual([
      'comments',
      'delivery_ownership',
      'employee_id',
      'quality_of_work',
      'review_period_id',
      'teamwork_collaboration',
    ])
  })

  it('reads the business-rule messages of a review conflict as plain messages, not field errors', async () => {
    const detail = "Employee EMP101 already has a review for '2026 H2'"
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail }, 409)))

    const { createReview } = await import('./reviews')
    const error = (await createReview({} as never).catch((e: unknown) => e)) as ApiError

    expect(error.status).toBe(409)
    expect(error.message).toBe(detail)
    expect(error.fieldErrors).toEqual({}) // it names no form field
  })
})
