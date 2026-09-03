import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSearchParams } from "@/hooks/use-search-params"

describe("useSearchParams", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "http://localhost:3000/applications")
  })

  it("reads parameters from window.location.search", () => {
    window.history.pushState({}, "", "http://localhost:3000/applications?status=Saved&source=LinkedIn")
    const { result } = renderHook(() => useSearchParams())
    const [params] = result.current

    expect(params.status).toBe("Saved")
    expect(params.source).toBe("LinkedIn")
  })

  it("updates parameters and modifies URL search correctly", () => {
    const { result } = renderHook(() => useSearchParams())

    act(() => {
      const [, setParams] = result.current
      setParams({ status: "Saved", search: "Engineer" })
    })

    const [params] = result.current
    expect(params.status).toBe("Saved")
    expect(params.search).toBe("Engineer")
    expect(window.location.search).toBe("?status=Saved&search=Engineer")
  })

  it("completely clears omitted or empty parameters when clearing filters", () => {
    window.history.pushState({}, "", "http://localhost:3000/applications?status=Saved&source=LinkedIn&search=React")
    const { result } = renderHook(() => useSearchParams())

    act(() => {
      const [, setParams] = result.current
      setParams({})
    })

    const [params] = result.current
    expect(params).toEqual({})
    expect(window.location.search).toBe("")
  })

  it("clears non-view parameters while preserving view mode", () => {
    window.history.pushState({}, "", "http://localhost:3000/applications?status=Saved&source=LinkedIn&view=list")
    const { result } = renderHook(() => useSearchParams())

    act(() => {
      const [currentParams, setParams] = result.current
      setParams(currentParams.view ? { view: currentParams.view } : {})
    })

    const [params] = result.current
    expect(params).toEqual({ view: "list" })
    expect(window.location.search).toBe("?view=list")
  })
})
