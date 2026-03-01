
"use client"

import React from "react"

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
  /** ID of the recommendation to edit (used in edit mode) */
  recommendationId?: string
  /** Initial data to populate the form when editing an existing recommendation */
  initialData?: any
  /** Initial category id for testing or controlled usage */
  initialCategoryId?: string
}

/**
 * Dialog component for creating and editing recommendations.
 * 
  )
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
  initialCategoryId,
  showLoginAlert,
  onDismissLoginAlert,
  onBlockedOpen,
}: AddRecommendationDialogProps & {
  showLoginAlert?: boolean
  onDismissLoginAlert?: () => void
  onBlockedOpen?: () => void
}) {
  // Track if we are waiting for session check to avoid race with dialog open
  const [checkingAuth, setCheckingAuth] = useState(false)
  const [open, setOpen] = useState(false)
  // Track if user tried to open dialog while not logged in
  const blockedOpenRef = useRef(false)
      // Helper to check if user is logged in
      const checkAuth = async () => {
        try {
          const res = await fetch("/api/auth/session")
          if (!res.ok) return false
          const session = await res.json()
          return !!session?.user?.id
        } catch {
          return false
        }
      }

      // Handler for trigger click
  const handleTriggerClick = async (e?: React.MouseEvent) => {
    if (checkingAuth) return
    setCheckingAuth(true)
    const isLoggedIn = await checkAuth()
    setCheckingAuth(false)
    if (!isLoggedIn) {
      blockedOpenRef.current = true
      if (onBlockedOpen) onBlockedOpen()
      setOpen(false)
      return
    }
    setOpen(true)
  }
    // Reset form state to initial values
    const resetForm = () => {
      // Clear any pending debounced search to prevent late-arriving suggestion updates
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = null
      }
      // Abort any in-flight detail fetches to prevent stale updates after form reset
      restaurantDetailsAbortRef.current?.abort()
      movieDetailsAbortRef.current?.abort()
      setFetchingRestaurantDetails(false)
      // Reset suggestion UI state so reopening the dialog doesn't show stale suggestions
      setShowSuggestions(false)
      setRestaurantSuggestions([])
      setMovieSuggestions([])
      setSelectedCategoryId("")
      setEntityName("")
      setTags([])
      setCurrentTag("")
      setLink("")
      setImageUrl("")
      setRating("")
      setMovieData({ director: "", year: "", genre: "", duration: "" })
      setRestaurantData({ cuisine: "", location: "", priceRange: "", hours: "", phoneNumber: "", placeId: "" })
      setFashionData({ brand: "", price: "", size: "", color: "" })
      setHouseholdData({ productType: "", model: "", purchaseLink: "" })
    }
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId || "")
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
  const [fetchingRestaurantDetails, setFetchingRestaurantDetails] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const restaurantDetailsAbortRef = useRef<AbortController | null>(null)
  const movieDetailsAbortRef = useRef<AbortController | null>(null)

  // Category-specific fields
  const [restaurantData, setRestaurantData] = useState({
    cuisine: "",
    location: "",
    priceRange: "",
    hours: "",
    phoneNumber: "",
    placeId: "",
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

  // Suggested tags state (combination of hardcoded and promoted community tags)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  // Abort in-flight detail fetches on unmount
  useEffect(() => {
    return () => {
      restaurantDetailsAbortRef.current?.abort()
      movieDetailsAbortRef.current?.abort()
    }
  }, [])

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories")
        if (res && res.ok) {
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
    if (!open) {
      // Abort any in-flight detail fetches when the dialog closes, regardless of mode
      restaurantDetailsAbortRef.current?.abort()
      movieDetailsAbortRef.current?.abort()
      return
    }
    if (open) {
      if (editMode && initialData) {
        setEntityName(initialData.entity?.name || "")
        setSelectedCategoryId(initialData.entity?.categoryId || initialCategoryId || "")
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
      } else {
        resetForm()
        if (initialCategoryId) setSelectedCategoryId(initialCategoryId)
      }
    }
  }, [editMode, initialData, open])

  // Fetch suggested tags when category changes
  useEffect(() => {
    const fetchSuggestedTags = async () => {
      if (!selectedCategoryId) {
        setSuggestedTags([])
        return
      }

      const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
      if (!selectedCategory || !["MOVIE", "RESTAURANT"].includes(selectedCategory.name)) {
        setSuggestedTags([])
        return
      }

      try {
        const res = await fetch(
          `/api/tags?categoryName=${encodeURIComponent(selectedCategory.name)}`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestedTags(data.tags || [])
        }
      } catch (error) {
        console.error("Error fetching suggested tags:", error)
        setSuggestedTags([])
      }
    }

    fetchSuggestedTags()
  }, [selectedCategoryId, categories, open])

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
        const data = await res.json()
        
        if (res.ok && data.results && data.results.length > 0) {
          setMovieSuggestions(data.results)
          setShowSuggestions(true)
        } else {
          setMovieSuggestions([])
          if (data.error) {
            console.error("Movie search error:", data.error)
          }
        }
      } catch (error) {
        console.error("Error searching movies:", error)
        setMovieSuggestions([])
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
        const data = await res.json()
        
        if (res.ok && data.results && data.results.length > 0) {
          setRestaurantSuggestions(data.results)
          setShowSuggestions(true)
        } else {
          setRestaurantSuggestions([])
          if (data.error) {
            console.error("Restaurant search error:", data.error)
          }
        }
      } catch (error) {
        console.error("Error searching restaurants:", error)
        setRestaurantSuggestions([])
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
    // Abort any in-flight movie details fetch to prevent stale responses
    if (movieDetailsAbortRef.current) {
      movieDetailsAbortRef.current.abort()
    }
    const abortController = new AbortController()
    movieDetailsAbortRef.current = abortController

    setEntityName(movie.title)
    setImageUrl(movie.posterPath || "")
    // Immediately reset movie-specific fields and link to avoid showing stale data
    setMovieData({
      year: movie.year?.toString() || "",
      genre: movie.genre || "",
      director: "",
      duration: "",
    })
    setLink("")
    // Fetch full movie details to populate all fields
    fetch(`/api/movies/${movie.id}`, { signal: abortController.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch movie details")
        const details = await res.json()
        setMovieData({
          year: details.year?.toString() || "",
          genre: details.genre || "",
          director: details.director || "",
          duration: details.duration || "",
        })
        setImageUrl(details.posterPath || movie.posterPath || "")
        setLink(details.imdbLink || "")
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        // fallback to what we have from search
        setMovieData({
          year: movie.year?.toString() || "",
          genre: movie.genre || "",
          director: "",
          duration: "",
        })
        setLink("")
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setShowSuggestions(false)
          setMovieSuggestions([])
        }
      })
  }

  /**
   * Handles selection of a restaurant from search suggestions.
   * Auto-populates form fields with restaurant data from Google Places.
   * 
   * @param restaurant - Selected restaurant suggestion object
   */
  const handleRestaurantSelect = (restaurant: RestaurantSuggestion) => {
    // Abort any in-flight restaurant details fetch to prevent stale responses
    if (restaurantDetailsAbortRef.current) {
      restaurantDetailsAbortRef.current.abort()
    }
    const abortController = new AbortController()
    restaurantDetailsAbortRef.current = abortController

    setEntityName(restaurant.name)
    setImageUrl(restaurant.imageUrl || "")
    // Set basic data from search results immediately for instant feedback
    setRestaurantData({
      cuisine: restaurant.categories || "",
      location: restaurant.location || "",
      priceRange: restaurant.price || "",
      hours: "",
      phoneNumber: "",
      placeId: restaurant.id || "",
    })
    // Clear link before fetching details to avoid stale data from a prior selection
    setLink("")
    // Fetch full details from the Details API
    setFetchingRestaurantDetails(true)
    fetch(`/api/restaurants/${restaurant.id}`, { signal: abortController.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch restaurant details")
        const details = await res.json()
        setRestaurantData({
          cuisine: details.cuisine || restaurant.categories || "",
          location: details.location || restaurant.location || "",
          priceRange: details.priceRange || restaurant.price || "",
          hours: details.hours || "",
          phoneNumber: details.phone || "",
          placeId: restaurant.id || "",
        })
        setImageUrl(details.imageUrl || restaurant.imageUrl || "")
        setLink(details.url || "")
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        // Fallback: keep the search result data already set above
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setFetchingRestaurantDetails(false)
          setShowSuggestions(false)
          setRestaurantSuggestions([])
        }
      })
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
        setRestaurantData({ cuisine: "", location: "", priceRange: "", hours: "", phoneNumber: "", placeId: "" })
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
        console.error("API Error Response:", { status: res.status, error })
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
  const isCategorySelected = !!selectedCategoryId

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <Dialog
        open={open}
        onOpenChange={async (nextOpen) => {
          // If blockedOpenRef is set, always force dialog closed and never open
          if (blockedOpenRef.current) {
            blockedOpenRef.current = false
            setOpen(false)
            return
          }
          // If trying to open, check auth again (covers edge/race cases)
          if (nextOpen) {
            const isLoggedIn = await checkAuth()
            if (!isLoggedIn) {
              blockedOpenRef.current = false
              if (onBlockedOpen) onBlockedOpen()
              setOpen(false)
              return
            }
          }
          setOpen(nextOpen)
        }}
      >
        <DialogTrigger asChild>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {trigger ? (
              // If custom trigger, clone and add onClick
              // @ts-ignore
              React.cloneElement(trigger as any, {
                onClick: (e: React.MouseEvent) => {
                  if (typeof (trigger as any).props?.onClick === 'function') {
                    (trigger as any).props.onClick(e)
                  }
                  handleTriggerClick(e)
                },
              })
            ) : (
              <Button onClick={handleTriggerClick} disabled={checkingAuth}>
                <Plus className="mr-2 h-4 w-4" />
                {editMode ? "Edit Recommendation" : "Add Recommendation"}
              </Button>
            )}
          </div>
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

            <div className={!isCategorySelected ? "opacity-60" : ""}>
            {/* Entity Name with Search */}
            <div className="space-y-2 relative">
              <Label htmlFor="entityName">
                {selectedCategory?.displayName || "Item"} Name *
              </Label>
              <div className="relative">
                <Input
                  id="entityName"
                  placeholder={selectedCategory?.name === "MOVIE" ? "Search movies..." : selectedCategory?.name === "RESTAURANT" ? "Search restaurants..." : `e.g., Inception, Joe's Pizza`}
                  value={entityName !== undefined ? String(entityName) : ""}
                  onChange={(e) => {
                    setEntityName(e.target.value)
                    if (selectedCategory?.name === "MOVIE") {
                      handleMovieSearch(e.target.value)
                    } else if (selectedCategory?.name === "RESTAURANT") {
                      handleRestaurantSearch(e.target.value)
                    }
                  }}
                  required
                  autoComplete="off"
                  disabled={!isCategorySelected}
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
          <div className="space-y-3">
            <Label htmlFor="tags">Why This Recommendation? (Tags)</Label>
            
            {/* Suggested Tags - Only show for MOVIE category */}
            {suggestedTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Suggested tags:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((suggestedTag) => {
                    const isSelected = tags.some(
                      (t) => t.toLowerCase() === suggestedTag.toLowerCase()
                    );
                    return (
                      <button
                        key={suggestedTag}
                        type="button"
                        disabled={!isCategorySelected}
                        onClick={() => {
                          if (!isSelected) {
                            setTags([...tags, suggestedTag]);
                          } else {
                            setTags(
                              tags.filter(
                                (t) => t.toLowerCase() !== suggestedTag.toLowerCase()
                              )
                            );
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {suggestedTag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Tag Input */}
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder={categories.find((c) => c.id === selectedCategoryId)?.name === "RESTAURANT" ? "e.g., Great ambiance" : "e.g., Great cinematography"}
                value={currentTag !== undefined ? String(currentTag) : ""}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                disabled={!isCategorySelected}
              />
              <Button type="button" onClick={handleAddTag} variant="outline" disabled={!isCategorySelected}>
                Add
              </Button>
            </div>

            {/* Selected Tags Display */}
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
            <Label htmlFor="rating">Rating (0-10)</Label>
            <div className="flex gap-1 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map((num) => {
                const selected = parseInt(rating || "0", 10) >= num;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={!isCategorySelected}
                    onClick={() => setRating(num.toString())}
                    className={`p-1 ${selected ? "text-yellow-400" : "text-gray-300"} disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={`Rate ${num} star${num > 1 ? 's' : ''}`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                );
              })}
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
                value={link !== undefined ? String(link) : ""}
                onChange={(e) => setLink(e.target.value)}
                disabled={!isCategorySelected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://..."
                value={imageUrl !== undefined ? String(imageUrl) : ""}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={!isCategorySelected}
              />
            </div>
          </div>

          {/* Category-Specific Fields */}
          {selectedCategory?.name === "RESTAURANT" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold flex items-center gap-2">
                Restaurant Details
                {fetchingRestaurantDetails && <Loader2 className="h-4 w-4 animate-spin" />}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Cuisine"
                  value={restaurantData.cuisine !== undefined ? String(restaurantData.cuisine) : ""}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, cuisine: e.target.value })
                  }
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Location"
                  value={restaurantData.location !== undefined ? String(restaurantData.location) : ""}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, location: e.target.value })
                  }
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Price Range"
                  value={restaurantData.priceRange !== undefined ? String(restaurantData.priceRange) : ""}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, priceRange: e.target.value })
                  }
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Hours"
                  value={restaurantData.hours !== undefined ? String(restaurantData.hours) : ""}
                  onChange={(e) =>
                    setRestaurantData({ ...restaurantData, hours: e.target.value })
                  }
                  disabled={!isCategorySelected}
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
                  value={movieData.director !== undefined ? String(movieData.director) : ""}
                  onChange={(e) => setMovieData({ ...movieData, director: e.target.value })}
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Year"
                  type="number"
                  value={movieData.year !== undefined ? String(movieData.year) : ""}
                  onChange={(e) => setMovieData({ ...movieData, year: e.target.value })}
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Genre"
                  value={movieData.genre !== undefined ? String(movieData.genre) : ""}
                  onChange={(e) => setMovieData({ ...movieData, genre: e.target.value })}
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Duration"
                  value={movieData.duration !== undefined ? String(movieData.duration) : ""}
                  onChange={(e) => setMovieData({ ...movieData, duration: e.target.value })}
                  disabled={!isCategorySelected}
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
                  value={fashionData.brand !== undefined ? String(fashionData.brand) : ""}
                  onChange={(e) => setFashionData({ ...fashionData, brand: e.target.value })}
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Price"
                  value={fashionData.price !== undefined ? String(fashionData.price) : ""}
                  onChange={(e) => setFashionData({ ...fashionData, price: e.target.value })}
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Size"
                  value={fashionData.size !== undefined ? String(fashionData.size) : ""}
                  onChange={(e) => setFashionData({ ...fashionData, size: e.target.value })}
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Color"
                  value={fashionData.color !== undefined ? String(fashionData.color) : ""}
                  onChange={(e) => setFashionData({ ...fashionData, color: e.target.value })}
                  disabled={!isCategorySelected}
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
                  value={householdData.productType !== undefined ? String(householdData.productType) : ""}
                  onChange={(e) =>
                    setHouseholdData({ ...householdData, productType: e.target.value })
                  }
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Model"
                  value={householdData.model !== undefined ? String(householdData.model) : ""}
                  onChange={(e) =>
                    setHouseholdData({ ...householdData, model: e.target.value })
                  }
                  disabled={!isCategorySelected}
                />
                <Input
                  placeholder="Purchase Link"
                  value={householdData.purchaseLink !== undefined ? String(householdData.purchaseLink) : ""}
                  onChange={(e) =>
                    setHouseholdData({ ...householdData, purchaseLink: e.target.value })
                  }
                  disabled={!isCategorySelected}
                />
              </div>
            </div>
          )}

          </div>

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
    </div>
  )
}
