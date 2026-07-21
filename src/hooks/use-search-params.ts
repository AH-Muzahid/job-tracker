"use client"

import { useCallback, useSyncExternalStore } from "react"

type Params = Record<string, string>

function getSnapshot(): string {
  return typeof window !== "undefined" ? window.location.search : ""
}

function getServerSnapshot(): string {
  return ""
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback)
  return () => window.removeEventListener("popstate", callback)
}

export function useSearchParams(): [Params, (params: Params) => void] {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const params = Object.fromEntries(new URLSearchParams(search))

  const setParams = useCallback((newParams: Params) => {
    const url = new URL(window.location.href)
    for (const [key, value] of Object.entries(newParams)) {
      if (value) {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    }
    window.history.pushState({}, "", url.toString())
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, [])

  return [params, setParams]
}
