import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges Tailwind CSS classes using clsx and tailwind-merge.
 * This utility resolves class conflicts and ensures proper Tailwind class precedence.
 * 
 * @param inputs - Variable number of class values (strings, objects, arrays)
 * @returns A single merged string of CSS classes
 * 
 * @example
 * cn('px-2 py-1', 'px-4') // Returns 'py-1 px-4' (px-4 overrides px-2)
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
