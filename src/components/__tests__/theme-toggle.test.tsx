import "@testing-library/jest-dom"
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ThemeToggle } from "@/components/theme-toggle"
import { THEME_STORAGE_KEY } from "@/lib/theme"

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark")
    localStorage.clear()
  })

  it("offers to switch to dark when the theme is light", () => {
    render(<ThemeToggle />)
    expect(
      screen.getByRole("button", { name: /switch to dark theme/i })
    ).toBeInTheDocument()
  })

  it("offers to switch to light when the theme is already dark", () => {
    document.documentElement.classList.add("dark")
    render(<ThemeToggle />)
    expect(
      screen.getByRole("button", { name: /switch to light theme/i })
    ).toBeInTheDocument()
  })

  it("applies the dark class and persists the choice on toggle", async () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole("button", { name: /switch to dark theme/i }))

    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    // The MutationObserver notifies asynchronously, so the label updates on the next tick.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /switch to light theme/i })
      ).toBeInTheDocument()
    })
  })

  it("removes the dark class and persists light on second toggle", async () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole("button", { name: /switch to dark theme/i }))
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /switch to light theme/i })
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /switch to light theme/i }))

    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
  })

  it("still toggles the class when localStorage throws", () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded")
      })

    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole("button"))

    expect(document.documentElement.classList.contains("dark")).toBe(true)
    setItem.mockRestore()
  })
})
