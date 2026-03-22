"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Clock, Package, Film, Calendar, ExternalLink } from "lucide-react"
import Image from "next/image"
import type { RefreshResult } from "@/components/refresh-entity-button"

// Custom DOM event name used to broadcast refresh results across the component tree
export const REFRESH_EVENT = "entity-data-refreshed"

interface MovieData {
  year?: number | null
  genre?: string | null
  duration?: string | null
  director?: string | null
  [key: string]: unknown
}

interface RestaurantData {
  cuisine?: string | null
  location?: string | null
  priceRange?: string | null
  hours?: string | null
  phoneNumber?: string | null
  [key: string]: unknown
}

interface EntityData {
  name: string
  movie?: MovieData | null
  restaurant?: RestaurantData | null
}

interface RefreshableEntityDetailsProps {
  /** Initial recommendation data from the server */
  initialEntity: EntityData
  initialImageUrl?: string | null
  /** Optional link shown in the restaurant card */
  link?: string | null
}

/**
 * Client component that renders the movie or restaurant detail card and hero image
 * with in-place updates and subtle per-field highlight animations after a refresh.
 *
 * Listens for the `entity-data-refreshed` custom DOM event dispatched by
 * RefreshEntityButton. When received, updates displayed data and briefly
 * highlights changed fields with a soft green background (bg-green-50) that
 * fades away over 1 second.
 */
export function RefreshableEntityDetails({
  initialEntity,
  initialImageUrl,
  link,
}: RefreshableEntityDetailsProps) {
  const [entity, setEntity] = useState<EntityData>(initialEntity)
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(initialImageUrl)
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set())

  const handleRefreshResult = useCallback((result: RefreshResult) => {
    // Merge updated entity data, preserving existing values for null API returns
    setEntity((prev) => {
      const updatedEntity = { ...prev }

      if (result.entity?.name) {
        updatedEntity.name = result.entity.name
      }

      if (prev.movie && result.entity?.movie) {
        updatedEntity.movie = { ...prev.movie, ...result.entity.movie }
      }

      if (prev.restaurant && result.entity?.restaurant) {
        updatedEntity.restaurant = { ...prev.restaurant, ...result.entity.restaurant }
      }

      return updatedEntity
    })

    if (result.imageUrl) {
      setImageUrl(result.imageUrl)
    }

    // Trigger highlights on updated fields, then clear after animation
    setHighlightedFields(new Set(result.updatedFields))
    setTimeout(() => setHighlightedFields(new Set()), 1200)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<RefreshResult>
      handleRefreshResult(customEvent.detail)
    }
    document.addEventListener(REFRESH_EVENT, handler)
    return () => document.removeEventListener(REFRESH_EVENT, handler)
  }, [handleRefreshResult])

  const hl = (field: string) =>
    highlightedFields.has(field)
      ? "bg-green-50 dark:bg-green-950/30 transition-colors duration-1000 rounded px-1 -mx-1"
      : "transition-colors duration-1000"

  return (
    <>
      {/* Hero image — updates in-place when imageUrl changes after refresh */}
      {imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover blur-2xl scale-110 opacity-60"
            aria-hidden="true"
          />
          <Image
            src={imageUrl}
            alt={entity.name}
            fill
            className="object-contain z-10"
            priority
          />
        </div>
      )}

      {/* Entity name (h1) — highlights when "name" field is refreshed */}
      <div>
        <h1 className={`text-4xl font-bold tracking-tight ${hl("name")}`}>
          {entity.name}
        </h1>
      </div>

      {/* Restaurant detail card */}
      {entity.restaurant && (
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entity.restaurant.cuisine && (
              <div className={`flex items-start gap-3 ${hl("cuisine")}`}>
                <Package className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Cuisine</p>
                  <p className="text-base">{entity.restaurant.cuisine}</p>
                </div>
              </div>
            )}
            {entity.restaurant.location && (
              <div className={`flex items-start gap-3 ${hl("location")}`}>
                <MapPin className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Location</p>
                  <p className="text-base">{entity.restaurant.location}</p>
                </div>
              </div>
            )}
            {entity.restaurant.priceRange && (
              <div className={`flex items-start gap-3 ${hl("priceRange")}`}>
                <span className="text-zinc-500 mt-0.5 shrink-0">💰</span>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Price Range</p>
                  <p className="text-base">{entity.restaurant.priceRange}</p>
                </div>
              </div>
            )}
            {entity.restaurant.hours && (
              <div className={`flex items-start gap-3 ${hl("hours")}`}>
                <Clock className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Hours</p>
                  <p className="text-base whitespace-pre-line">{entity.restaurant.hours}</p>
                </div>
              </div>
            )}
            {entity.restaurant.phoneNumber && (
              <div className={`flex items-start gap-3 ${hl("phoneNumber")}`}>
                <span className="text-zinc-500 mt-0.5 shrink-0">📞</span>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Phone</p>
                  <p className="text-base">{entity.restaurant.phoneNumber}</p>
                </div>
              </div>
            )}
            {link && (
              <div className="flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Website</p>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:underline break-all"
                  >
                    {link}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Movie detail card */}
      {entity.movie && (
        <Card>
          <CardHeader>
            <CardTitle>Movie Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entity.movie.director && (
              <div className="flex items-start gap-3">
                <Film className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Director</p>
                  <p className="text-base">{entity.movie.director}</p>
                </div>
              </div>
            )}
            {entity.movie.year && (
              <div className={`flex items-start gap-3 ${hl("year")}`}>
                <Calendar className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Year</p>
                  <p className="text-base">{entity.movie.year}</p>
                </div>
              </div>
            )}
            {entity.movie.genre && (
              <div className={`flex items-start gap-3 ${hl("genre")}`}>
                <Package className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Genre</p>
                  <p className="text-base">{entity.movie.genre}</p>
                </div>
              </div>
            )}
            {entity.movie.duration && (
              <div className={`flex items-start gap-3 ${hl("duration")}`}>
                <Clock className="h-5 w-5 text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-500">Duration</p>
                  <p className="text-base">{entity.movie.duration}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
