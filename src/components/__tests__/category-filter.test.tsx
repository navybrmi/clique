import "@testing-library/jest-dom"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CategoryFilter } from "../category-filter"

describe("CategoryFilter", () => {
  const onChange = jest.fn()

  beforeEach(() => onChange.mockClear())

  it('renders the "Filter Category:" label', () => {
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    expect(screen.getByText("Filter Category:")).toBeInTheDocument()
  })

  it('shows "All" in the trigger when all categories are selected', () => {
    render(
      <CategoryFilter selectedCategories={["Movie", "Restaurant"]} onChange={onChange} />
    )
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument()
  })

  it('shows "None" in the trigger when no categories are selected', () => {
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    expect(screen.getByRole("button", { name: /none/i })).toBeInTheDocument()
  })

  it("shows the selected category label in the trigger when only one is selected", () => {
    render(<CategoryFilter selectedCategories={["Movie"]} onChange={onChange} />)
    expect(screen.getByRole("button", { name: /movies/i })).toBeInTheDocument()
  })

  it("opens the dropdown with Movies and Restaurants options", async () => {
    const user = userEvent.setup()
    render(
      <CategoryFilter selectedCategories={["Movie", "Restaurant"]} onChange={onChange} />
    )
    await user.click(screen.getByRole("button", { name: /all/i }))
    expect(screen.getByRole("menuitemcheckbox", { name: /movies/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitemcheckbox", { name: /restaurants/i })).toBeInTheDocument()
  })

  it("does not show other category options in the dropdown", async () => {
    const user = userEvent.setup()
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: /none/i }))
    expect(screen.queryByRole("menuitemcheckbox", { name: /fashion/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("menuitemcheckbox", { name: /household/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("menuitemcheckbox", { name: /^other/i })).not.toBeInTheDocument()
  })

  it("marks Movies as checked when Movie is in selectedCategories", async () => {
    const user = userEvent.setup()
    render(
      <CategoryFilter selectedCategories={["Movie"]} onChange={onChange} />
    )
    await user.click(screen.getByRole("button", { name: /movies/i }))
    expect(screen.getByRole("menuitemcheckbox", { name: /movies/i })).toHaveAttribute(
      "aria-checked",
      "true"
    )
    expect(screen.getByRole("menuitemcheckbox", { name: /restaurants/i })).toHaveAttribute(
      "aria-checked",
      "false"
    )
  })

  it("calls onChange with category added when an unchecked item is clicked", async () => {
    const user = userEvent.setup()
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: /none/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /movies/i }))
    expect(onChange).toHaveBeenCalledWith(["Movie"])
  })

  it("calls onChange with category removed when a checked item is clicked", async () => {
    const user = userEvent.setup()
    render(
      <CategoryFilter selectedCategories={["Movie", "Restaurant"]} onChange={onChange} />
    )
    await user.click(screen.getByRole("button", { name: /all/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /movies/i }))
    expect(onChange).toHaveBeenCalledWith(["Restaurant"])
  })

  it("keeps the dropdown open after selecting an item", async () => {
    const user = userEvent.setup()
    render(<CategoryFilter selectedCategories={[]} onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: /none/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /movies/i }))
    expect(screen.getByRole("menuitemcheckbox", { name: /restaurants/i })).toBeInTheDocument()
  })
})
