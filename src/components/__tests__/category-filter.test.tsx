import "@testing-library/jest-dom"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CategoryFilter } from "../category-filter"

describe("CategoryFilter", () => {
  const onChange = jest.fn()

  beforeEach(() => onChange.mockClear())

  it("renders both Movies and Restaurants chips", () => {
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    expect(screen.getByRole("button", { name: /movies/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /restaurants/i })).toBeInTheDocument()
  })

  it("does not render other category options", () => {
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    expect(screen.queryByRole("button", { name: /fashion/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /household/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /other/i })).not.toBeInTheDocument()
  })

  it("marks chips as pressed when their value is in selectedCategories", () => {
    render(
      <CategoryFilter selectedCategories={["Movie", "Restaurant"]} onChange={onChange} />
    )
    expect(screen.getByRole("button", { name: /movies/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: /restaurants/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("marks chips as not pressed when their value is not in selectedCategories", () => {
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    expect(screen.getByRole("button", { name: /movies/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    expect(screen.getByRole("button", { name: /restaurants/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("calls onChange with category added when an unselected chip is clicked", async () => {
    const user = userEvent.setup()
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: /movies/i }))
    expect(onChange).toHaveBeenCalledWith(["Movie"])
  })

  it("calls onChange with category removed when a selected chip is clicked", async () => {
    const user = userEvent.setup()
    render(
      <CategoryFilter selectedCategories={["Movie", "Restaurant"]} onChange={onChange} />
    )
    await user.click(screen.getByRole("button", { name: /movies/i }))
    expect(onChange).toHaveBeenCalledWith(["Restaurant"])
  })

  it("only Movies chip is pressed when only Movie is selected", () => {
    render(<CategoryFilter selectedCategories={["Movie"]} onChange={onChange} />)
    expect(screen.getByRole("button", { name: /movies/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: /restaurants/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })
})
