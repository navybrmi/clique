import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowUp, MessageCircle, Share2, ArrowLeft, ExternalLink, MapPin, Clock, Star, Calendar, Film, ShoppingBag, Package } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import { Header } from "@/components/header"
import { EditRecommendationButton } from "@/components/edit-recommendation-button"
import { DeleteRecommendationButton } from "@/components/delete-recommendation-button"
import { CommentsSection } from "@/components/comments-section"
import { ActionsSidebar } from "@/components/actions-sidebar"
import { auth } from "@/lib/auth"

export default async function RecommendationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const recommendation = await prisma.recommendation.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      entity: {
        include: {
          category: true,
          restaurant: true,
          movie: true,
          fashion: true,
          household: true,
          other: true,
        },
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          upvotes: true,
          comments: true,
        },
      },
    },
  }) as any

  if (!recommendation) {
    notFound()
  }

  const isOwner = session?.user?.id === recommendation.userId

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <Header showBack={true} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            {recommendation.imageUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                <Image
                  src={recommendation.imageUrl}
                  alt=""
                  fill
                  className="object-cover blur-2xl scale-110 opacity-60"
                  aria-hidden="true"
                />
                <Image
                  src={recommendation.imageUrl}
                  alt={recommendation.entity.name}
                  fill
                  className="object-contain z-10"
                  priority
                />
              </div>
            )}

            {/* Title and Category */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Badge className="text-sm">{recommendation.entity.category.displayName}</Badge>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5,6,7,8,9,10].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          (recommendation.rating || 0) >= star
                            ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_1px_3px_rgba(234,179,8,0.6)]'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold ml-1">{recommendation.rating || 0}/10</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{recommendation.entity.name}</h1>
            </div>

            {/* Tags / Why This Recommendation */}
            {recommendation.tags && recommendation.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Why This Recommendation?</h3>
                <div className="flex flex-wrap gap-2">
                  {recommendation.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Category-Specific Details */}
            {recommendation.entity.restaurant && (
              <Card>
                <CardHeader>
                  <CardTitle>Restaurant Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendation.cuisine && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Cuisine</p>
                        <p className="text-base">{recommendation.cuisine}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Location</p>
                        <p className="text-base">{recommendation.location}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.priceRange && (
                    <div className="flex items-start gap-3">
                      <span className="text-zinc-500 mt-0.5">💰</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Price Range</p>
                        <p className="text-base">{recommendation.priceRange}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.hours && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Hours</p>
                        <p className="text-base">{recommendation.hours}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {recommendation.entity.movie && (
              <Card>
                <CardHeader>
                  <CardTitle>Movie Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendation.entity.movie.director && (
                    <div className="flex items-start gap-3">
                      <Film className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Director</p>
                        <p className="text-base">{recommendation.entity.movie.director}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.movie.releaseYear && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Year</p>
                        <p className="text-base">{recommendation.entity.movie.releaseYear}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.movie.genre && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Genre</p>
                        <p className="text-base">{recommendation.entity.movie.genre}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.movie.duration && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Duration</p>
                        <p className="text-base">{recommendation.entity.movie.duration} mins</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {recommendation.entity.fashion && (
              <Card>
                <CardHeader>
                  <CardTitle>Fashion Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendation.entity.fashion.brand && (
                    <div className="flex items-start gap-3">
                      <ShoppingBag className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Brand</p>
                        <p className="text-base">{recommendation.entity.fashion.brand}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.fashion.itemType && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Type</p>
                        <p className="text-base">{recommendation.entity.fashion.itemType}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.fashion.size && (
                    <div className="flex items-start gap-3">
                      <span className="text-zinc-500 mt-0.5">📏</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Size</p>
                        <p className="text-base">{recommendation.entity.fashion.size}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.fashion.color && (
                    <div className="flex items-start gap-3">
                      <span className="text-zinc-500 mt-0.5">🎨</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Color</p>
                        <p className="text-base">{recommendation.entity.fashion.color}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {recommendation.entity.household && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendation.entity.household.productType && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Product Type</p>
                        <p className="text-base">{recommendation.entity.household.productType}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.household.brand && (
                    <div className="flex items-start gap-3">
                      <ShoppingBag className="h-5 w-5 text-zinc-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Brand</p>
                        <p className="text-base">{recommendation.entity.household.brand}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.household.model && (
                    <div className="flex items-start gap-3">
                      <span className="text-zinc-500 mt-0.5">🏷️</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Model</p>
                        <p className="text-base">{recommendation.entity.household.model}</p>
                      </div>
                    </div>
                  )}
                  {recommendation.entity.household.price && (
                    <div className="flex items-start gap-3">
                      <span className="text-zinc-500 mt-0.5">💰</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-500">Price</p>
                        <p className="text-base">{recommendation.entity.household.price}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <CommentsSection
              recommendationId={recommendation.id}
              initialComments={recommendation.comments}
              initialCount={recommendation._count.comments}
            />

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <ActionsSidebar recommendation={recommendation} />
            <Card>
              <CardContent className="pt-6 space-y-3">
                <EditRecommendationButton recommendation={recommendation} isOwner={isOwner} />
                <DeleteRecommendationButton recommendation={recommendation} isOwner={isOwner} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
