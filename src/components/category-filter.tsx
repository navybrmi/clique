"use client"

import { Button } from "@/components/ui/button"

const FILTER_OPTIONS = [
  { label: "🎬 Movies", value: "Movie" },
  { label: "🍽️ Restaurants", value: "Restaurant" },
] as const

interface CategoryFilterProps {
  selectedCategories: string[]
  onChange: (categories: string[]) => void
}

export function CategoryFilter({ selectedCategories, onChange }: CategoryFilterProps) {
  const toggle = (value: string) => {
    if (selectedCategories.includes(value)) {
      onChange(selectedCategories.filter((c) => c !== value))
    } else {
      onChange([...selectedCategories, value])
    }
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Filter by category">
      {FILTER_OPTIONS.map(({ label, value }) => {
        const isSelected = selectedCategories.includes(value)
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={isSelected ? "default" : "outline"}
            aria-pressed={isSelected}
            onClick={() => toggle(value)}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}
