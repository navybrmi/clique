"use client"

import { useState, useCallback, useRef, useEffect } from "react"

/**
 * Returns a boolean highlight state and a trigger function.
 * When trigger() is called, the boolean becomes true for `duration` ms,
 * then automatically resets to false. Used to apply brief CSS highlight
 * animations to fields after they are updated.
 *
 * The internal timeout is tracked in a ref so that:
 * - Rapid calls to trigger() cancel the previous timer (no overlapping resets)
 * - The timer is cleared on unmount to prevent state updates after unmount
 *
 * @param duration - How long the highlight stays active in ms (default: 1200)
 * @returns [highlighted, trigger] tuple
 */
export function useHighlight(duration = 1200): [boolean, () => void] {
  const [highlighted, setHighlighted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const trigger = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    setHighlighted(true)
    timerRef.current = setTimeout(() => {
      setHighlighted(false)
      timerRef.current = null
    }, duration)
  }, [duration])

  return [highlighted, trigger]
}
