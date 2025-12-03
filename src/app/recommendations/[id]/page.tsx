import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2, ArrowLeft, ExternalLink, MapPin, Clock, Star } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function RecommendationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

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
          likes: true,
          comments: true,
        },
      },
    },
  })

  if (!recommendation) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-black/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Clique</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button>Get Started</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Category */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Badge className="text-sm">{recommendation.category}</Badge>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{recommendation.rating || 0}</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{recommendation.title}</h1>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={recommendation.user.image || undefined} />
                <AvatarFallback>{recommendation.user.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Recommended by {recommendation.user.name || 'Anonymous'}</p>
                <p className="text-sm text-zinc-500">{new Date(recommendation.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {recommendation.description}
                </p>
              </CardContent>
            </Card>

            {/* Link if available */}
            {recommendation.link && (
              <Card>
                <CardHeader>
                  <CardTitle>Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href={recommendation.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {recommendation.link}
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle>Comments ({recommendation._count.comments})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendation.comments.length > 0 ? (
                  recommendation.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user.image || undefined} />
                        <AvatarFallback>{comment.user.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{comment.user.name || 'Anonymous'}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{comment.content}</p>
                        <p className="text-xs text-zinc-400 mt-1">{new Date(comment.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">No comments yet</p>
                )}
                <div className="pt-4 border-t">
                  <p className="text-sm text-zinc-500 text-center">Sign in to add a comment</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button className="w-full gap-2" size="lg">
                  <Heart className="h-5 w-5" />
                  Like ({recommendation._count.likes})
                </Button>
                <Button variant="outline" className="w-full gap-2" size="lg">
                  <MessageCircle className="h-5 w-5" />
                  Comment ({recommendation._count.comments})
                </Button>
                <Button variant="outline" className="w-full gap-2" size="lg">
                  <Share2 className="h-5 w-5" />
                  Share
                </Button>
                {recommendation.link && (
                  <Button variant="secondary" className="w-full gap-2" size="lg" asChild>
                    <a href={recommendation.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5" />
                      Visit Link
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Rating</span>
                  <span className="font-semibold">{recommendation.rating || 0}/5.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Likes</span>
                  <span className="font-semibold">{recommendation._count.likes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Comments</span>
                  <span className="font-semibold">{recommendation._count.comments}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
