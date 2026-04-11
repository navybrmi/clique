import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { SubmitterInfo } from "../submitter-info"

describe("SubmitterInfo", () => {
  it("renders the submitter name", () => {
    render(<SubmitterInfo name="Jane Smith" createdAt="2026-01-05T12:00:00.000Z" />)
    expect(screen.getByText(/Recommended by Jane Smith/)).toBeInTheDocument()
  })

  it("renders 'Anonymous' when name is null", () => {
    render(<SubmitterInfo name={null} createdAt="2026-01-05T12:00:00.000Z" />)
    expect(screen.getByText(/Recommended by Anonymous/)).toBeInTheDocument()
  })

  it("renders the date formatted using the local timezone", () => {
    const isoString = "2026-01-05T12:00:00.000Z"
    render(<SubmitterInfo name="Jane Smith" createdAt={isoString} />)
    const expectedDate = new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    expect(screen.getByText(new RegExp(expectedDate))).toBeInTheDocument()
  })

  it("renders the date in a span with suppressHydrationWarning", () => {
    render(<SubmitterInfo name="Jane Smith" createdAt="2026-01-05T12:00:00.000Z" />)
    const isoString = "2026-01-05T12:00:00.000Z"
    const expectedDate = new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    const dateSpan = screen.getByText(expectedDate)
    expect(dateSpan.tagName).toBe("SPAN")
  })
})
