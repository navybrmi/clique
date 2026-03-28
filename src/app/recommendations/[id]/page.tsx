import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingBag, Package } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { EditRecommendationButton } from "@/components/edit-recommendation-button"
import { DeleteRecommendationButton } from "@/components/delete-recommendation-button"
import { RefreshEntityButton } from "@/components/refresh-entity-button"
import { RefreshableEntityDetails } from "@/components/refreshable-entity-details"
import { CommentsSection } from "@/components/comments-section"
import { ActionsSidebar } from "@/components/actions-sidebar"
import { auth } from "@/lib/auth"

export default async function RecommendationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [recommendation, session] = await Promise.all([
    prisma.recommendation.findUnique({
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
    }) as Promise<any>,
    auth(),
  ])

  const currentUserId = session?.user?.id ?? null

  if (!recommendation) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <Header showBack={true} session={session} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero image, entity name, and movie/restaurant detail cards — client component
               that updates in-place and animates changed fields after a refresh */}
            <RefreshableEntityDetails
              initialEntity={{
                name: recommendation.entity.name,
                movie: recommendation.entity.movie
                  ? {
                      year: recommendation.entity.movie.year ?? null,
                      genre: recommendation.entity.movie.genre ?? null,
                      duration: recommendation.entity.movie.duration
                        ? String(recommendation.entity.movie.duration)
                        : null,
                      director: recommendation.entity.movie.director ?? null,
                    }
                  : null,
                restaurant: recommendation.entity.restaurant
                  ? {
                      cuisine: recommendation.entity.restaurant.cuisine ?? null,
                      location: recommendation.entity.restaurant.location ?? null,
                      priceRange: recommendation.entity.restaurant.priceRange ?? null,
                      hours: recommendation.entity.restaurant.hours ?? null,
                      phoneNumber: recommendation.entity.restaurant.phoneNumber ?? null,
                    }
                  : null,
              }}
              initialImageUrl={recommendation.imageUrl ?? null}
              link={recommendation.link ?? null}
            >
              {/* Category badge + rating — shown directly below the entity name */}
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

              {/* Tags / Why This Recommendation — always visible */}
              <div>
                <h3 className="font-semibold mb-2">Why This Recommendation?</h3>
                <div className="flex flex-wrap gap-2">
                  {recommendation.tags && recommendation.tags.length > 0 ? (
                    recommendation.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-400 italic">No tags added</span>
                  )}
                </div>
              </div>
            </RefreshableEntityDetails>

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
              currentUserId={currentUserId}
            />

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <ActionsSidebar recommendation={recommendation} />
            <Card>
              <CardContent className="pt-6 space-y-3">
                <EditRecommendationButton recommendation={recommendation} currentUserId={currentUserId} />
                {(recommendation.entity.movie || recommendation.entity.restaurant) && (
                  <RefreshEntityButton recommendation={recommendation} currentUserId={currentUserId} />
                )}
                <DeleteRecommendationButton recommendation={recommendation} currentUserId={currentUserId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
