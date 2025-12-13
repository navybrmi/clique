import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@clique.app' },
    update: {},
    create: {
      id: 'demo-user-1',
      email: 'demo@clique.app',
      name: 'Demo User',
    },
  })

  console.log('✅ Created demo user:', user.email)

  // Create categories (use uppercase names to match existing convention)
  const restaurantCategory = await prisma.category.upsert({
    where: { name: 'RESTAURANT' },
    update: {},
    create: {
      id: 'cat-restaurant',
      name: 'RESTAURANT',
      displayName: 'Restaurant',
      description: 'Restaurants and dining experiences',
      icon: '🍽️',
    },
  })

  const movieCategory = await prisma.category.upsert({
    where: { name: 'MOVIE' },
    update: {},
    create: {
      id: 'cat-movie',
      name: 'MOVIE',
      displayName: 'Movie',
      description: 'Movies and TV shows',
      icon: '🎬',
    },
  })

  const fashionCategory = await prisma.category.upsert({
    where: { name: 'FASHION' },
    update: {},
    create: {
      id: 'cat-fashion',
      name: 'FASHION',
      displayName: 'Fashion',
      description: 'Fashion and accessories',
      icon: '👗',
    },
  })

  console.log('✅ Created categories')

  // Create entities with recommendations
  const italianEntity = await prisma.entity.upsert({
    where: { id: 'entity-italian-restaurant' },
    update: {},
    create: {
      id: 'entity-italian-restaurant',
      name: 'The Italian Corner',
      categoryId: restaurantCategory.id,
      restaurant: {
        create: {
          cuisine: 'Italian',
          location: '123 Main St, Downtown',
          priceRange: '$$-$$$',
          hours: 'Mon-Sun: 11:30 AM - 10:00 PM',
        },
      },
    },
  })

  await prisma.recommendation.upsert({
    where: { id: 'rec-1' },
    update: {},
    create: {
      id: 'rec-1',
      entityId: italianEntity.id,
      userId: user.id,
      rating: 9,
      tags: ['Authentic pasta', 'Amazing tiramisu', 'Romantic ambiance'],
      link: 'https://example.com/italian-corner',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    },
  })

  const movieEntity = await prisma.entity.upsert({
    where: { id: 'entity-oppenheimer' },
    update: {},
    create: {
      id: 'entity-oppenheimer',
      name: 'Oppenheimer',
      categoryId: movieCategory.id,
      movie: {
        create: {
          director: 'Christopher Nolan',
          year: 2023,
          genre: 'Biography, Drama, History',
          duration: '3h 0min',
        },
      },
    },
  })

  await prisma.recommendation.upsert({
    where: { id: 'rec-2' },
    update: {},
    create: {
      id: 'rec-2',
      entityId: movieEntity.id,
      userId: user.id,
      rating: 10,
      tags: ['Masterpiece', 'Must watch in IMAX', 'Powerful storytelling'],
      link: 'https://www.imdb.com/title/tt15398776/',
      imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
    },
  })

  const backpackEntity = await prisma.entity.upsert({
    where: { id: 'entity-minimalist-backpack' },
    update: {},
    create: {
      id: 'entity-minimalist-backpack',
      name: 'Minimalist Backpack',
      categoryId: fashionCategory.id,
      fashion: {
        create: {
          brand: 'Peak Design',
          price: '$149.99',
          size: 'One Size',
          color: 'Charcoal',
        },
      },
    },
  })

  await prisma.recommendation.upsert({
    where: { id: 'rec-3' },
    update: {},
    create: {
      id: 'rec-3',
      entityId: backpackEntity.id,
      userId: user.id,
      rating: 8,
      tags: ['Perfect for daily commute', 'Durable', 'Water-resistant', 'Laptop-friendly'],
      link: 'https://example.com/backpack',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    },
  })

  console.log('✅ Created 3 sample recommendations')
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
