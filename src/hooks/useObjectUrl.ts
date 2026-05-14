import { useEffect, useRef } from 'react'

/** Automatically revokes an object URL when it changes or component unmounts. */
export function useObjectUrl(url: string | null | undefined) {
  const prev = useRef<string | null>(null)

  useEffect(() => {
    if (prev.current && prev.current !== url) {
      URL.revokeObjectURL(prev.current)
    }
    prev.current = url ?? null
    return () => {
      if (prev.current) {
        URL.revokeObjectURL(prev.current)
        prev.current = null
      }
    }
  }, [url])
}
