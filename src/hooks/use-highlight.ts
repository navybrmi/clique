"use client"

import { useState, useCallback } from "react"

/**
 * Returns a boolean highlight state and a trigger function.
 * When trigger() is called, the boolean becomes true for `duration` ms,
 * then automatically resets to false. Used to apply brief CSS highlight
 * animations to fields after they are updated.
 *
 * @param duration - How long the highlight stays active in ms (default: 1200)
 * @returns [highlighted, trigger] tuple
 */
export function useHighlight(duration = 1200): [boolean, () => void] {
  const [highlighted, setHighlighted] = useState(false)

  const trigger = useCallback(() => {
    setHighlighted(true)
    setTimeout(() => setHighlighted(false), duration)
  }, [duration])

  return [highlighted, trigger]
}
