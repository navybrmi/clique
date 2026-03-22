import { renderHook, act } from "@testing-library/react"
import { useHighlight } from "../use-highlight"

describe("useHighlight", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns false initially", () => {
    const { result } = renderHook(() => useHighlight())
    const [highlighted] = result.current
    expect(highlighted).toBe(false)
  })

  it("returns true immediately after trigger() is called", () => {
    const { result } = renderHook(() => useHighlight())

    act(() => {
      const [, trigger] = result.current
      trigger()
    })

    const [highlighted] = result.current
    expect(highlighted).toBe(true)
  })

  it("returns false after the default duration (1200ms) elapses", () => {
    const { result } = renderHook(() => useHighlight())

    act(() => {
      const [, trigger] = result.current
      trigger()
    })

    expect(result.current[0]).toBe(true)

    act(() => {
      jest.advanceTimersByTime(1200)
    })

    expect(result.current[0]).toBe(false)
  })

  it("returns false after a custom duration elapses", () => {
    const { result } = renderHook(() => useHighlight(500))

    act(() => {
      const [, trigger] = result.current
      trigger()
    })

    expect(result.current[0]).toBe(true)

    act(() => {
      jest.advanceTimersByTime(499)
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current[0]).toBe(false)
  })

  it("stays true if duration has not yet elapsed", () => {
    const { result } = renderHook(() => useHighlight(1000))

    act(() => {
      const [, trigger] = result.current
      trigger()
    })

    act(() => {
      jest.advanceTimersByTime(999)
    })

    expect(result.current[0]).toBe(true)
  })
})
