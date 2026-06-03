"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const FILTER_OPTIONS = [
  { label: "🎬 Movies", value: "Movie" },
  { label: "🍽️ Restaurants", value: "Restaurant" },
] as const

interface CategoryFilterProps {
  selectedCategories: string[]
  onChange: (categories: string[]) => void
}

function getTriggerLabel(selectedCategories: string[]): string {
  if (selectedCategories.length === 0) return "None"
  if (selectedCategories.length === FILTER_OPTIONS.length) return "All"
  return selectedCategories
    .map((v) => FILTER_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(", ")
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
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Filter Category:
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            {getTriggerLabel(selectedCategories)}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {FILTER_OPTIONS.map(({ label, value }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={selectedCategories.includes(value)}
              onCheckedChange={() => toggle(value)}
              onSelect={(e) => e.preventDefault()}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
