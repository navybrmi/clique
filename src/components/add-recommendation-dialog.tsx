"use client"

import { useState, useEffect } from "react"
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
import { Plus, Star, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: string
  name: string
  displayName: string
}

interface AddRecommendationDialogProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
  editMode?: boolean
  recommendationId?: string
  initialData?: any
}

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

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

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
          {/* Entity Name */}
          <div className="space-y-2">
            <Label htmlFor="entityName">
              {selectedCategory?.displayName || "Item"} Name *
            </Label>
            <Input
              id="entityName"
              placeholder="e.g., Inception, Joe's Pizza"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              required
            />
          </div>

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
