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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Star } from "lucide-react"

const categories = ["RESTAURANT", "MOVIE", "FASHION", "HOUSEHOLD", "OTHER"]

interface AddRecommendationDialogProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
  editMode?: boolean
  recommendationId?: string
  initialData?: any
}

export function AddRecommendationDialog({ onSuccess, trigger, editMode = false, recommendationId, initialData }: AddRecommendationDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [movieSuggestions, setMovieSuggestions] = useState<any[]>([])
  const [restaurantSuggestions, setRestaurantSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchingMovies, setSearchingMovies] = useState(false)
  const [searchingRestaurants, setSearchingRestaurants] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const [movieAttributes, setMovieAttributes] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    link: "",
    imageUrl: "",
    rating: "",
    // Restaurant fields
    cuisine: "",
    location: "",
    priceRange: "",
    hours: "",
    // Movie fields
    director: "",
    year: "",
    genre: "",
    duration: "",
    // Fashion fields
    brand: "",
    price: "",
    size: "",
    color: "",
    // Household fields
    productType: "",
    model: "",
  })

  // Load initial data when in edit mode
  useEffect(() => {
    if (editMode && initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        category: initialData.category || "",
        link: initialData.link || "",
        imageUrl: initialData.imageUrl || "",
        rating: initialData.rating?.toString() || "",
        cuisine: initialData.cuisine || "",
        location: initialData.location || "",
        priceRange: initialData.priceRange || "",
        hours: initialData.hours || "",
        director: initialData.director || "",
        year: initialData.year?.toString() || "",
        genre: initialData.genre || "",
        duration: initialData.duration || "",
        brand: initialData.brand || "",
        price: initialData.price || "",
        size: initialData.size || "",
        color: initialData.color || "",
        productType: initialData.productType || "",
        model: initialData.model || "",
      })
      if (initialData.movieAttributes) {
        setMovieAttributes(initialData.movieAttributes)
      }
    }
  }, [editMode, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current session
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      
      if (!session?.user?.id) {
        alert('Please sign in to create recommendations')
        setLoading(false)
        return
      }

      const payload: Record<string, any> = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        link: formData.link || null,
        imageUrl: formData.imageUrl || null,
        rating: formData.rating ? parseInt(formData.rating) : null,
      }

      // Only include userId for create, not update
      if (!editMode) {
        payload.userId = session.user.id
      }

      // Add category-specific fields
      if (formData.category === "RESTAURANT") {
        payload.cuisine = formData.cuisine || null
        payload.location = formData.location || null
        payload.priceRange = formData.priceRange || null
        payload.hours = formData.hours || null
      } else if (formData.category === "MOVIE") {
        payload.director = formData.director || null
        payload.year = formData.year ? parseInt(formData.year) : null
        payload.genre = formData.genre || null
        payload.duration = formData.duration || null
        payload.movieAttributes = movieAttributes
      } else if (formData.category === "FASHION") {
        payload.brand = formData.brand || null
        payload.price = formData.price || null
        payload.size = formData.size || null
        payload.color = formData.color || null
      } else if (formData.category === "HOUSEHOLD") {
        payload.productType = formData.productType || null
        payload.brand = formData.brand || null
        payload.model = formData.model || null
        payload.price = formData.price || null
      }

      const url = editMode ? `/api/recommendations/${recommendationId}` : "/api/recommendations"
      const method = editMode ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(editMode ? "Failed to update recommendation" : "Failed to create recommendation")
      }

      // Reset form only in create mode
      if (!editMode) {
        setFormData({
          title: "",
          description: "",
          category: "",
          link: "",
          imageUrl: "",
          rating: "",
          cuisine: "",
          location: "",
          priceRange: "",
          hours: "",
          director: "",
          year: "",
          genre: "",
          duration: "",
          brand: "",
          price: "",
          size: "",
          color: "",
          productType: "",
          model: "",
        })
        setMovieAttributes([])
      }
      
      setOpen(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error(editMode ? "Error updating recommendation:" : "Error creating recommendation:", error)
      alert("Failed to create recommendation. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Search movies from TMDB
  const searchMovies = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setMovieSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearchingMovies(true)
    try {
      const response = await fetch(`/api/movies/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setMovieSuggestions(data.results || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error("Error searching movies:", error)
      setMovieSuggestions([])
    } finally {
      setSearchingMovies(false)
    }
  }

  // Handle movie title input change with debouncing
  const handleMovieTitleChange = (value: string) => {
    setFormData({ ...formData, title: value })

    // Only search if category is MOVIE
    if (formData.category !== "MOVIE") return

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      searchMovies(value)
    }, 300) // 300ms debounce
  }

  // Handle movie selection from suggestions
  const handleMovieSelect = async (movie: any) => {
    setShowSuggestions(false)
    setSearchingMovies(true)

    try {
      // Fetch detailed movie information
      const response = await fetch(`/api/movies/${movie.id}`)
      const details = await response.json()

      setFormData({
        ...formData,
        title: details.title,
        director: details.director || "",
        year: details.year?.toString() || "",
        genre: details.genre || "",
        duration: details.duration || "",
        imageUrl: details.posterPath || formData.imageUrl,
        description: details.overview || formData.description,
        link: details.imdbLink || formData.link,
      })
    } catch (error) {
      console.error("Error fetching movie details:", error)
      // Just use the basic info from search
      setFormData({
        ...formData,
        title: movie.title,
        year: movie.year?.toString() || "",
      })
    } finally {
      setSearchingMovies(false)
    }
  }

  // Search restaurants from Yelp
  const searchRestaurants = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setRestaurantSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearchingRestaurants(true)
    try {
      const response = await fetch(`/api/restaurants/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      setRestaurantSuggestions(data.results || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error("Error searching restaurants:", error)
      setRestaurantSuggestions([])
    } finally {
      setSearchingRestaurants(false)
    }
  }

  // Handle restaurant title input change with debouncing
  const handleRestaurantTitleChange = (value: string) => {
    setFormData({ ...formData, title: value })

    // Only search if category is RESTAURANT
    if (formData.category !== "RESTAURANT") return

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      searchRestaurants(value)
    }, 300) // 300ms debounce
  }

  // Handle restaurant selection from suggestions
  const handleRestaurantSelect = async (restaurant: any) => {
    setShowSuggestions(false)
    setRestaurantSuggestions([])
    setSearchingRestaurants(true)

    try {
      // Fetch detailed restaurant information
      const response = await fetch(`/api/restaurants/${restaurant.id}`)
      const details = await response.json()

      setFormData({
        ...formData,
        title: details.name,
        cuisine: details.cuisine || "",
        location: details.location || "",
        priceRange: details.priceRange || "",
        hours: details.hours || "",
        imageUrl: details.imageUrl || formData.imageUrl,
        link: details.url || formData.link,
        rating: details.rating?.toString() || formData.rating,
      })
    } catch (error) {
      console.error("Error fetching restaurant details:", error)
      // Just use the basic info from search
      setFormData({
        ...formData,
        title: restaurant.name,
        location: restaurant.location || "",
        cuisine: restaurant.categories || "",
        priceRange: restaurant.price || "",
      })
    } finally {
      setSearchingRestaurants(false)
    }
  }

  // Handle title change based on category
  const handleTitleChange = (value: string) => {
    if (formData.category === "MOVIE") {
      handleMovieTitleChange(value)
    } else if (formData.category === "RESTAURANT") {
      handleRestaurantTitleChange(value)
    } else {
      setFormData({ ...formData, title: value })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Recommendation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Recommendation" : "Add Recommendation"}</DialogTitle>
            <DialogDescription>
              {editMode ? "Update your recommendation details below." : "Share something you love with your friends. Fill in the details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Category Field - First to determine form behavior */}
            <div className="grid gap-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title Field */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="title"
                  placeholder={
                    formData.category === "MOVIE" 
                      ? "Start typing a movie name..." 
                      : formData.category === "RESTAURANT"
                      ? "Start typing a restaurant name..."
                      : "e.g., The Best Pizza in Town"
                  }
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onFocus={() => {
                    if (formData.category === "MOVIE" && movieSuggestions.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  required
                  autoComplete="off"
                />
                {(searchingMovies || searchingRestaurants) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"></div>
                  </div>
                )}
                {showSuggestions && movieSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
                    {movieSuggestions.map((movie) => (
                      <button
                        key={movie.id}
                        type="button"
                        className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-zinc-100 transition-colors"
                        onClick={() => handleMovieSelect(movie)}
                      >
                        {movie.posterPath && (
                          <img
                            src={movie.posterPath}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{movie.title}</p>
                          {movie.year && (
                            <p className="text-xs text-zinc-500">{movie.year}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {formData.category === "RESTAURANT" && restaurantSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
                    {restaurantSuggestions.map((restaurant) => (
                      <button
                        key={restaurant.id}
                        type="button"
                        className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-zinc-100 transition-colors"
                        onClick={() => handleRestaurantSelect(restaurant)}
                      >
                        {restaurant.imageUrl && (
                          <img
                            src={restaurant.imageUrl}
                            alt={restaurant.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{restaurant.name}</p>
                          {restaurant.location && (
                            <p className="text-xs text-zinc-500 truncate">{restaurant.location}</p>
                          )}
                          {restaurant.categories && (
                            <p className="text-xs text-zinc-400 truncate">{restaurant.categories}</p>
                          )}
                        </div>
                        {restaurant.rating && (
                          <div className="flex items-center gap-1 text-xs text-zinc-600">
                            <span>⭐</span>
                            <span>{restaurant.rating}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell us why you love it..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rating">Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star.toString() })}
                    className="focus:outline-none transition-colors"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        formData.rating && parseInt(formData.rating) >= star
                          ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_2px_4px_rgba(234,179,8,0.6)]'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                type="url"
                placeholder="https://example.com"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
            </div>

            {/* Category-Specific Fields */}
            {formData.category === "RESTAURANT" && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Restaurant Details</h3>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Input
                    id="cuisine"
                    placeholder="e.g., Italian, Japanese, Mexican"
                    value={formData.cuisine}
                    onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., 123 Main St, Downtown"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priceRange">Price Range</Label>
                  <Input
                    id="priceRange"
                    placeholder="e.g., $$-$$$"
                    value={formData.priceRange}
                    onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    placeholder="e.g., Mon-Sun: 11:30 AM - 10:00 PM"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.category === "MOVIE" && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Movie Details</h3>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="director">Director</Label>
                  <Input
                    id="director"
                    placeholder="e.g., Christopher Nolan"
                    value={formData.director}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="e.g., 2023"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    placeholder="e.g., Drama, Thriller, Action"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    placeholder="e.g., 2h 30min"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Why Recommend This Movie?</Label>
                  <p className="text-sm text-gray-500 mb-2">Select characteristics that apply:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Great plot twists",
                      "Complex narrative",
                      "Character-driven",
                      "Fast-paced",
                      "Slow burn",
                      "Non-linear storytelling",
                      "Based on true story",
                      "Strong dialogue",
                      "Unpredictable ending",
                      "Beautiful cinematography",
                      "Amazing visuals/CGI",
                      "Great soundtrack/score",
                      "Excellent acting performances",
                      "Award-winning",
                      "Innovative/Original",
                      "Well-directed",
                      "Binge-worthy",
                      "Rewatchable",
                      "Great for date night",
                      "Perfect for group watching",
                      "Good for kids",
                      "Educational",
                      "Escapist entertainment",
                      "Strong female lead",
                      "Ensemble cast",
                      "Underrated gem",
                      "Cult classic",
                      "Franchise starter",
                      "Standalone masterpiece",
                      "Great world-building"
                    ].map((attribute) => (
                      <label
                        key={attribute}
                        className="flex items-center space-x-2 p-2 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={movieAttributes.includes(attribute)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMovieAttributes([...movieAttributes, attribute])
                            } else {
                              setMovieAttributes(movieAttributes.filter(a => a !== attribute))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm">{attribute}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {formData.category === "FASHION" && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Product Details</h3>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="e.g., Nike, Adidas, Zara"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    placeholder="e.g., $99.99"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    placeholder="e.g., Medium, Large, One Size"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    placeholder="e.g., Black, Navy, Red"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.category === "HOUSEHOLD" && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Product Details</h3>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productType">Product Type</Label>
                  <Input
                    id="productType"
                    placeholder="e.g., Appliance, Furniture, Decor"
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    placeholder="e.g., Samsung, IKEA, Dyson"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="e.g., Model XYZ-2000"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    placeholder="e.g., $299.99"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title || !formData.category}>
              {loading ? (editMode ? "Updating..." : "Creating...") : (editMode ? "Update Recommendation" : "Create Recommendation")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
