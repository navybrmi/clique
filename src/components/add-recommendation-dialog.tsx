"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Star, X, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/**
 * Category data structure
 */
interface Category {
  id: string
  name: string
  displayName: string
}

/**
 * Movie suggestion from TMDB API search results
 */
interface MovieSuggestion {
  id: number
  title: string
  year: string
  posterPath?: string
  overview?: string
  genre?: string
}

/**
 * Restaurant suggestion from Google Places API search results
 */
interface RestaurantSuggestion {
  id: string
  name: string
  imageUrl: string
  location: string
  categories?: string
  price?: string
  rating?: number
  reviewCount?: number
  phone?: string
}

/**
 * Props for the AddRecommendationDialog component
 */
interface AddRecommendationDialogProps {
  /** Callback function called after successful recommendation creation/update */
  onSuccess?: () => void
  /** Custom trigger element. If not provided, uses default "Add Recommendation" button */
  trigger?: React.ReactNode
  /** Whether the dialog is in edit mode (true) or create mode (false) */
  editMode?: boolean
  recommendationId?: string
  initialData?: any
}

/**
 * Dialog component for creating and editing recommendations.
 * 
 * A comprehensive form for adding recommendations across multiple categories
 * (Movies, Restaurants, Fashion, Household, Other). Features:
 * 
 * - Category-specific form fields
 * - Real-time search for movies (TMDB) and restaurants (Google Places)
 * - Auto-population from search results
 * - Tag management with add/remove functionality
 * - Image URL and rating support
 * - Edit mode with pre-populated data
 * - Loading states and error handling
 * 
 * The component dynamically shows/hides fields based on selected category
 * and provides suggestions as user types for movies and restaurants.
 * 
 * @param props - Component props
 * @returns A modal dialog with dynamic recommendation form
 */
export function AddRecommendationDialog({
  onSuccess,
  trigger,
  editMode = false,
  recommendationId,
  initialData,
}: AddRecommendationDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [entityName, setEntityName] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [link, setLink] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [rating, setRating] = useState("")

  // Search functionality
  const [movieSuggestions, setMovieSuggestions] = useState<MovieSuggestion[]>([])
  const [restaurantSuggestions, setRestaurantSuggestions] = useState<RestaurantSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchingMovies, setSearchingMovies] = useState(false)
  const [searchingRestaurants, setSearchingRestaurants] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Category-specific fields
  const [restaurantData, setRestaurantData] = useState({
    cuisine: "",
    location: "",
    priceRange: "",
    hours: "",
  })
  const [movieData, setMovieData] = useState({
    director: "",
    year: "",
    genre: "",
    duration: "",
  })
  const [fashionData, setFashionData] = useState({
    brand: "",
    price: "",
    size: "",
    color: "",
  })
  const [householdData, setHouseholdData] = useState({
    productType: "",
    model: "",
    purchaseLink: "",
  })

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories")
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
    fetchCategories()
  }, [])

  // Load initial data in edit mode
  useEffect(() => {
    if (editMode && initialData) {
      setEntityName(initialData.entity?.name || "")
      setSelectedCategoryId(initialData.entity?.categoryId || "")
      setTags(initialData.tags || [])
      setLink(initialData.link || "")
      setImageUrl(initialData.imageUrl || "")
      setRating(initialData.rating?.toString() || "")

      if (initialData.entity?.restaurant) {
        setRestaurantData(initialData.entity.restaurant)
      }
      if (initialData.entity?.movie) {
        setMovieData(initialData.entity.movie)
      }
      if (initialData.entity?.fashion) {
        setFashionData(initialData.entity.fashion)
      }
      if (initialData.entity?.household) {
        setHouseholdData(initialData.entity.household)
      }
    }
  }, [editMode, initialData, open])

  /**
   * Searches for movies using TMDB API with debouncing.
   * Updates movie suggestions state with search results.
   * 
   * @param query - Movie title search term
   */
  const handleMovieSearch = async (query: string) => {
    setEntityName(query)
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (!query.trim()) {
      setMovieSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearchingMovies(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies/search?query=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setMovieSuggestions(data.results || [])
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error("Error searching movies:", error)
      } finally {
        setSearchingMovies(false)
      }
    }, 300)
  }

  /**
   * Searches for restaurants using Google Places API with debouncing.
   * Updates restaurant suggestions state with search results.
   * 
   * @param query - Restaurant name or search term
   */
  const handleRestaurantSearch = async (query: string) => {
    setEntityName(query)
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (!query.trim()) {
      setRestaurantSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearchingRestaurants(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/restaurants/search?query=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setRestaurantSuggestions(data.results || [])
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error("Error searching restaurants:", error)
      } finally {
        setSearchingRestaurants(false)
      }
    }, 300)
  }

  /**
   * Handles selection of a movie from search suggestions.
   * Auto-populates form fields with movie data from TMDB.
   * 
   * @param movie - Selected movie suggestion object
   */
  const handleMovieSelect = (movie: MovieSuggestion) => {
    setEntityName(movie.title)
    setImageUrl(movie.posterPath || "")
    setMovieData({
      year: movie.year?.toString() || "",
      genre: movie.genre || "",
      director: "", // TMDB doesn't provide director in search results
      duration: "",
    })
    setShowSuggestions(false)
    setMovieSuggestions([])
  }

  /**
   * Handles selection of a restaurant from search suggestions.
   * Auto-populates form fields with restaurant data from Google Places.
   * 
   * @param restaurant - Selected restaurant suggestion object
   */
  const handleRestaurantSelect = (restaurant: RestaurantSuggestion) => {
    setEntityName(restaurant.name)
    setImageUrl(restaurant.imageUrl || "")
    setRestaurantData({
      cuisine: restaurant.categories || "",
      location: restaurant.location || "",
      priceRange: restaurant.price || "",
      hours: "", // Google Places doesn't provide hours in text search
    })
    setShowSuggestions(false)
    setRestaurantSuggestions([])
  }

  /**
   * Adds a new tag to the tags array.
   * Prevents duplicate tags and trims whitespace.
   */
  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  /**
   * Removes a tag from the tags array.
   * 
   * @param tag - Tag string to remove
   */
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  /**
   * Handles form submission for creating or updating a recommendation.
   * 
   * - Validates required fields
   * - Sends POST (create) or PUT (edit) request to API
   * - Resets form on success
   * - Calls onSuccess callback
   * - Handles errors with user alerts
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const sessionRes = await fetch("/api/auth/session")
      const session = await sessionRes.json()

      if (!session?.user?.id) {
        alert("Please sign in to create recommendations")
        setLoading(false)
        return
      }

      if (!entityName || !selectedCategoryId) {
        alert("Entity name and category are required")
        setLoading(false)
        return
      }

      const payload: Record<string, any> = {
        entityName,
        categoryId: selectedCategoryId,
        tags,
        link: link || null,
        imageUrl: imageUrl || null,
        rating: rating ? parseInt(rating) : null,
        userId: session.user.id,
      }

      // Add category-specific data
      const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
      if (selectedCategory?.name === "RESTAURANT") {
        payload.restaurantData = restaurantData
      } else if (selectedCategory?.name === "MOVIE") {
        payload.movieData = movieData
      } else if (selectedCategory?.name === "FASHION") {
        payload.fashionData = fashionData
      } else if (selectedCategory?.name === "HOUSEHOLD") {
        payload.householdData = householdData
      }

      const url = editMode ? `/api/recommendations/${recommendationId}` : "/api/recommendations"
      const method = editMode ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setOpen(false)
        // Reset form
        setEntityName("")
        setSelectedCategoryId("")
        setTags([])
        setLink("")
        setImageUrl("")
        setRating("")
        setRestaurantData({ cuisine: "", location: "", priceRange: "", hours: "" })
        setMovieData({ director: "", year: "", genre: "", duration: "" })
        setFashionData({ brand: "", price: "", size: "", color: "" })
        setHouseholdData({ productType: "", model: "", purchaseLink: "" })
        setMovieSuggestions([])
        setRestaurantSuggestions([])

        if (onSuccess) {
          onSuccess()
        }
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to save recommendation")
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {editMode ? "Edit Recommendation" : "Add Recommendation"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Recommendation" : "Add New Recommendation"}</DialogTitle>
          <DialogDescription>
            {editMode ? "Update your recommendation details" : "Create a new recommendation"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity Name with Search */}
          <div className="space-y-2 relative">
            <Label htmlFor="entityName">
              {selectedCategory?.displayName || "Item"} Name *
            </Label>
            <div className="relative">
              <Input
                id="entityName"
                placeholder={selectedCategory?.name === "MOVIE" ? "Search movies..." : selectedCategory?.name === "RESTAURANT" ? "Search restaurants..." : `e.g., Inception, Joe's Pizza`}
                value={entityName}
                onChange={(e) => {
                  if (selectedCategory?.name === "MOVIE") {
                    handleMovieSearch(e.target.value)
                  } else if (selectedCategory?.name === "RESTAURANT") {
                    handleRestaurantSearch(e.target.value)
                  } else {
                    setEntityName(e.target.value)
                  }
                }}
                required
                autoComplete="off"
              />
              {(searchingMovies || searchingRestaurants) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </div>

            {/* Movie Suggestions */}
            {selectedCategory?.name === "MOVIE" && showSuggestions && movieSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
                {movieSuggestions.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => handleMovieSelect(movie)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-start gap-3 border-b last:border-b-0"
                  >
                    {movie.posterPath && (
                      <img
                        src={movie.posterPath}
                        alt={movie.title}
                        className="h-12 w-8 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{movie.title}</div>
                      <div className="text-sm text-gray-600">{movie.year}</div>
                      {movie.genre && (
                        <div className="text-xs text-gray-500 truncate">{movie.genre}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Restaurant Suggestions */}
            {selectedCategory?.name === "RESTAURANT" && showSuggestions && restaurantSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
                {restaurantSuggestions.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    onClick={() => handleRestaurantSelect(restaurant)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-start gap-3 border-b last:border-b-0"
                  >
                    {restaurant.imageUrl && (
                      <img
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        className="h-12 w-12 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{restaurant.name}</div>
                      <div className="text-sm text-gray-600 truncate">{restaurant.location}</div>
                      {restaurant.categories && (
                        <div className="text-xs text-gray-500 truncate">{restaurant.categories}</div>
                      )}
                      {restaurant.price && (
                        <div className="text-xs text-gray-500">{restaurant.price}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Why This Recommendation? (Tags)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="e.g., Great cinematography"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label htmlFor="rating">Rating (0-5)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num.toString())}
                  className={`p-1 ${rating === num.toString() ? "text-yellow-400" : "text-gray-300"}`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Link and Image */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                type="url"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Category-Specific Fields */}
          {selectedCategory?.name === "RESTAURANT" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Restaurant Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Cuisine"
                  value={restaurantData.cuisine}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, cuisine: e.target.value })
                  }
                />
                <Input
                  placeholder="Location"
                  value={restaurantData.location}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, location: e.target.value })
                  }
                />
                <Input
                  placeholder="Price Range"
                  value={restaurantData.priceRange}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, priceRange: e.target.value })
                  }
                />
                <Input
                  placeholder="Hours"
                  value={restaurantData.hours}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, hours: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {selectedCategory?.name === "MOVIE" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Movie Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Director"
                  value={movieData.director}
                  onChange={(e) => setMovieData({ ...movieData, director: e.target.value })}
                />
                <Input
                  placeholder="Year"
                  type="number"
                  value={movieData.year}
                  onChange={(e) => setMovieData({ ...movieData, year: e.target.value })}
                />
                <Input
                  placeholder="Genre"
                  value={movieData.genre}
                  onChange={(e) => setMovieData({ ...movieData, genre: e.target.value })}
                />
                <Input
                  placeholder="Duration"
                  value={movieData.duration}
                  onChange={(e) => setMovieData({ ...movieData, duration: e.target.value })}
                />
              </div>
            </div>
          )}

          {selectedCategory?.name === "FASHION" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Fashion Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Brand"
                  value={fashionData.brand}
                  onChange={(e) => setFashionData({ ...fashionData, brand: e.target.value })}
                />
                <Input
                  placeholder="Price"
                  value={fashionData.price}
                  onChange={(e) => setFashionData({ ...fashionData, price: e.target.value })}
                />
                <Input
                  placeholder="Size"
                  value={fashionData.size}
                  onChange={(e) => setFashionData({ ...fashionData, size: e.target.value })}
                />
                <Input
                  placeholder="Color"
                  value={fashionData.color}
                  onChange={(e) => setFashionData({ ...fashionData, color: e.target.value })}
                />
              </div>
            </div>
          )}

          {selectedCategory?.name === "HOUSEHOLD" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Household Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Product Type"
                  value={householdData.productType}
                  onChange={(e) =>
                    setHouseholdData({ ...householdData, productType: e.target.value })
                  }
                />
                <Input
                  placeholder="Model"
                  value={householdData.model}
                  onChange={(e) =>
                    setHouseholdData({ ...householdData, model: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : editMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
