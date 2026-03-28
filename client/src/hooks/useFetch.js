import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Simple async data-fetching hook.
 *
 * const { data, loading, error, refetch } = useFetch(getPlayers)
 * const { data } = useFetch(() => getGame(id), [id])
 */
export default function useFetch(fetcher, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const abortRef = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError(err.response?.data?.error || err.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    fetch()
    return () => { abortRef.current?.abort() }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
