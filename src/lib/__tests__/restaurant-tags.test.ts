/**
 * Tests for restaurant tag suggestions
 */

import {
  RESTAURANT_TAG_SUGGESTIONS,
  getHardcodedRestaurantTags,
  isHardcodedRestaurantTag,
} from "../restaurant-tags"

describe("Restaurant Tags", () => {
  describe("RESTAURANT_TAG_SUGGESTIONS", () => {
    it("should contain curated restaurant tags", () => {
      expect(RESTAURANT_TAG_SUGGESTIONS.length).toBe(20)
      expect(RESTAURANT_TAG_SUGGESTIONS).toContain("Great ambiance")
      expect(RESTAURANT_TAG_SUGGESTIONS).toContain("Excellent service")
      expect(RESTAURANT_TAG_SUGGESTIONS).toContain("Hidden gem")
    })

    it("should not contain duplicates", () => {
      const unique = new Set(RESTAURANT_TAG_SUGGESTIONS.map((t) => t.toLowerCase()))
      expect(unique.size).toBe(RESTAURANT_TAG_SUGGESTIONS.length)
    })
  })

  describe("getHardcodedRestaurantTags", () => {
    it("should return all restaurant tag suggestions", () => {
      const tags = getHardcodedRestaurantTags()
      expect(tags).toEqual(RESTAURANT_TAG_SUGGESTIONS)
    })

    it("should return an array of strings", () => {
      const tags = getHardcodedRestaurantTags()
      tags.forEach((tag) => {
        expect(typeof tag).toBe("string")
      })
    })
  })

  describe("isHardcodedRestaurantTag", () => {
    it("should return true for exact match", () => {
      expect(isHardcodedRestaurantTag("Great ambiance")).toBe(true)
    })

    it("should return true for case-insensitive match", () => {
      expect(isHardcodedRestaurantTag("great ambiance")).toBe(true)
      expect(isHardcodedRestaurantTag("GREAT AMBIANCE")).toBe(true)
    })

    it("should return true with leading/trailing whitespace", () => {
      expect(isHardcodedRestaurantTag("  Great ambiance  ")).toBe(true)
    })

    it("should return false for non-hardcoded tags", () => {
      expect(isHardcodedRestaurantTag("Not a real tag")).toBe(false)
      expect(isHardcodedRestaurantTag("")).toBe(false)
    })

    it("should return false for movie tags", () => {
      expect(isHardcodedRestaurantTag("Great cinematography")).toBe(false)
      expect(isHardcodedRestaurantTag("Compelling story")).toBe(false)
    })
  })
})
