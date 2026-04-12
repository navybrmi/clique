import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import DataDeletionPage from "../page"

describe("DataDeletionPage", () => {
  it("renders the Data Deletion Instructions heading", () => {
    render(<DataDeletionPage />)
    expect(screen.getByRole("heading", { name: /data deletion instructions/i })).toBeInTheDocument()
  })

  it("does not contain the word Facebook anywhere on the page", () => {
    render(<DataDeletionPage />)
    expect(screen.queryByText(/facebook/i)).not.toBeInTheDocument()
  })

  it("does not render the Automatic Data Removal section", () => {
    render(<DataDeletionPage />)
    expect(screen.queryByText(/automatic data removal/i)).not.toBeInTheDocument()
  })

  it("renders the What Data We Store section with provider-neutral phrasing", () => {
    render(<DataDeletionPage />)
    expect(screen.getByText(/when you sign in, we store:/i)).toBeInTheDocument()
  })

  it("does not include Facebook user ID in any list", () => {
    render(<DataDeletionPage />)
    expect(screen.queryByText(/facebook user id/i)).not.toBeInTheDocument()
  })

  it("renders the How to Request Data Deletion section", () => {
    render(<DataDeletionPage />)
    expect(screen.getByRole("heading", { name: /how to request data deletion/i })).toBeInTheDocument()
  })

  it("renders the privacy contact email link", () => {
    render(<DataDeletionPage />)
    const links = screen.getAllByRole("link", { name: /privacy@clique\.app/i })
    expect(links.length).toBeGreaterThan(0)
  })
})
