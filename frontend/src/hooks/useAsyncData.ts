import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T }

/**
 * Runs `load` when the component mounts and exposes its progress. `load` must be a stable
 * function (defined outside the component or wrapped in useCallback), otherwise it reloads on
 * every render. Call `reload()` to try again, for example after an error.
 */
export function useAsyncData<T>(load: (signal: AbortSignal) => Promise<T>) {
  // Starts as "loading"; the effect below only ever reports results, never resets the state.
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })
    // Cancel the request if the component goes away or a newer load starts.
    return () => controller.abort()
  }, [load, reloadCount])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setReloadCount((count) => count + 1)
  }, [])

  return { state, reload }
}
