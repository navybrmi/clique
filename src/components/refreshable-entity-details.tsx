"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Clock, Package, Film, Calendar, ExternalLink } from "lucide-react"
import Image from "next/image"
import type { RefreshResult } from "@/components/refresh-entity-button"

/**
 * Custom DOM event name dispatched by RefreshEntityButton after a successful
 * refresh API call. RefreshableEntityDetails listens for this event and applies
 * targeted in-place updates without a full page reload.
 *
 * @example
 * ```typescript
 * document.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: result }))
 * ```
 */
export const REFRESH_EVENT = "entity-data-refreshed"

/**
 * Movie-specific fields displayed and updated by the entity detail card.
 * All fields are optional because TMDB may not return every value on refresh.
 */
interface MovieData {
  /** Release year */
  year?: number | null
  /** Comma-separated genre names */
  genre?: string | null
  /** Formatted runtime, e.g. "2h 28m" */
  duration?: string | null
  /** Director's name */
  director?: string | null
  [key: string]: unknown
}

/**
 * Restaurant-specific fields displayed and updated by the entity detail card.
 * All fields are optional because the Places API may not return every value on refresh.
 */
interface RestaurantData {
  /** Cuisine type(s) derived from Google Places `types` */
  cuisine?: string | null
  /** Formatted street address */
  location?: string | null
  /** Price range expressed as dollar signs, e.g. "$$" */
  priceRange?: string | null
  /** Newline-separated weekly opening hours */
  hours?: string | null
  /** Formatted phone number */
  phoneNumber?: string | null
  [key: string]: unknown
}

/**
 * Unified entity data shape consumed by this component, covering both movie
 * and restaurant variants via their respective optional sub-objects.
 */
interface EntityData {
  /** Display name of the entity (film title or restaurant name) */
  name: string
  /** Present when the entity belongs to the MOVIE category */
  movie?: MovieData | null
  /** Present when the entity belongs to the RESTAURANT category */
  restaurant?: RestaurantData | null
}

/**
 * Props for the RefreshableEntityDetails component.
 */
interface RefreshableEntityDetailsProps {
  /** Initial entity data rendered on first load (from server-side fetch) */
  initialEntity: EntityData
  /** Initial hero image URL rendered on first load */
  initialImageUrl?: string | null
  /** Optional external link shown in the restaurant detail card */
  link?: string | null
  /**
   * Optional content rendered between the entity name and the detail card.
   * Use this slot for recommendation metadata (category badge, rating, tags)
   * that should appear immediately below the title.
   */
  children?: React.ReactNode
  /**
   * Optional content rendered immediately after the hero image and before
   * the entity name. Use this slot for submitter/attribution metadata.
   */
  afterImage?: React.ReactNode
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
  children,
  afterImage,
}: RefreshableEntityDetailsProps) {
  const [entity, setEntity] = useState<EntityData>(initialEntity)
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(initialImageUrl)
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set())
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  /**
   * Merges the refresh result into local state and triggers field highlight animations.
   * Only fields returned by the API are updated; existing values are preserved for
   * fields where the external API returned null.
   *
   * @param result - Payload from the `entity-data-refreshed` custom event
   */
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

    // Trigger highlights on updated fields, cancelling any previous timer
    if (highlightTimerRef.current !== null) clearTimeout(highlightTimerRef.current)
    setHighlightedFields(new Set(result.updatedFields))
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedFields(new Set())
      highlightTimerRef.current = null
    }, 1200)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<RefreshResult>
      handleRefreshResult(customEvent.detail)
    }
    document.addEventListener(REFRESH_EVENT, handler)
    return () => document.removeEventListener(REFRESH_EVENT, handler)
  }, [handleRefreshResult])

  /**
   * Returns Tailwind class names that apply a temporary green highlight when the
   * given field name is present in the current `highlightedFields` set.
   *
   * @param field - Field name matching a key in `RefreshResult.updatedFields`
   * @returns Space-separated Tailwind class string
   */
  const hl = (field: string) =>
    `px-1 -mx-1 rounded transition-colors duration-1000 ${
      highlightedFields.has(field)
        ? "bg-green-50 dark:bg-green-950/30"
        : ""
    }`

  return (
    <>
      {/* Hero image — updates in-place when imageUrl changes after refresh */}
      {imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover blur-2xl scale-110 opacity-60"
            aria-hidden="true"
          />
          <Image
            src={imageUrl}
            alt={entity.name}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-contain z-10"
            priority
          />
        </div>
      )}

      {/* Entity name (h1) with optional submitter info below on mobile, beside on desktop */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h1 className={`text-2xl font-bold tracking-tight sm:text-4xl ${hl("name")}`}>
          {entity.name}
        </h1>
        {afterImage && <div className="shrink-0 sm:pt-2">{afterImage}</div>}
      </div>

      {/* Slot for recommendation metadata (category, rating, tags) */}
      {children}

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
