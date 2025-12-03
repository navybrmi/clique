"use client"

import { useState } from "react"
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
import { Plus } from "lucide-react"

const categories = ["RESTAURANT", "MOVIE", "FASHION", "HOUSEHOLD", "OTHER"]

interface AddRecommendationDialogProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function AddRecommendationDialog({ onSuccess, trigger }: AddRecommendationDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: Record<string, any> = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        link: formData.link || null,
        imageUrl: formData.imageUrl || null,
        rating: formData.rating ? parseInt(formData.rating) : null,
        userId: "demo-user-1",
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

      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to create recommendation")
      }

      // Reset form
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
      
      setOpen(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error creating recommendation:", error)
      alert("Failed to create recommendation. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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
            <DialogTitle>Add Recommendation</DialogTitle>
            <DialogDescription>
              Share something you love with your friends. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Fields */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., The Best Pizza in Town"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
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
              <Label htmlFor="rating">Rating (0-10)</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="10"
                placeholder="Rate it from 0 to 10"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              />
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
              {loading ? "Creating..." : "Create Recommendation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
