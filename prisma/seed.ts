import { PrismaClient, Category } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'demo@clique.app' },
    update: {},
    create: {
      email: 'demo@clique.app',
      name: 'Demo User',
      image: null,
    },
  })

  console.log('✅ Created user:', user.email)

  // Create sample recommendations
  const recommendations = [
    {
      title: 'The Italian Corner',
      description: 'Amazing authentic pasta and incredible tiramisu! This cozy restaurant in the heart of downtown offers the best Italian cuisine I\'ve had outside of Italy. The atmosphere is warm and inviting, perfect for a date night or family dinner.',
      category: Category.RESTAURANT,
      rating: 5,
      link: 'https://example.com/italian-corner',
      imageUrl: null,
      userId: user.id,
    },
    {
      title: 'Oppenheimer',
      description: 'A masterpiece of cinema. Must watch in IMAX! Christopher Nolan delivers a powerful biographical thriller that explores the life of J. Robert Oppenheimer. The cinematography is stunning, and the performances are Oscar-worthy.',
      category: Category.MOVIE,
      rating: 5,
      link: 'https://www.imdb.com/title/tt15398776/',
      imageUrl: null,
      userId: user.id,
    },
    {
      title: 'Minimalist Backpack',
      description: 'Perfect for daily commute, durable and stylish. This sleek backpack combines functionality with minimalist design. Water-resistant material, multiple compartments, and comfortable straps make it ideal for work or travel.',
      category: Category.FASHION,
      rating: 4,
      link: 'https://example.com/minimalist-backpack',
      imageUrl: null,
      userId: user.id,
    },
    {
      title: 'Sushi Paradise',
      description: 'The freshest sushi in town! The chef sources fish daily from the market. Don\'t miss their omakase experience.',
      category: Category.RESTAURANT,
      rating: 5,
      link: null,
      imageUrl: null,
      userId: user.id,
    },
    {
      title: 'The Bear - Season 2',
      description: 'Incredible TV series about a fine dining restaurant in Chicago. Intense, emotional, and beautifully shot.',
      category: Category.MOVIE,
      rating: 5,
      link: 'https://www.imdb.com/title/tt14452776/',
      imageUrl: null,
      userId: user.id,
    },
    {
      title: 'Robot Vacuum Cleaner X500',
      description: 'Life-changing! This vacuum has been a game changer for keeping our home clean with minimal effort.',
      category: Category.HOUSEHOLD,
      rating: 5,
      link: null,
      imageUrl: null,
      userId: user.id,
    },
  ]

  for (const rec of recommendations) {
    const created = await prisma.recommendation.create({
      data: rec,
    })
    console.log('✅ Created recommendation:', created.title)
  }

  // Add some sample comments
  const allRecommendations = await prisma.recommendation.findMany()
  
  if (allRecommendations.length > 0) {
    await prisma.comment.create({
      data: {
        content: 'Totally agree! Been there three times already.',
        userId: user.id,
        recommendationId: allRecommendations[0].id,
      },
    })

    await prisma.comment.create({
      data: {
        content: 'Thanks for the recommendation, will check it out!',
        userId: user.id,
        recommendationId: allRecommendations[0].id,
      },
    })

    console.log('✅ Created sample comments')
  }

  // Add some sample likes
  if (allRecommendations.length > 0) {
    await prisma.like.create({
      data: {
        userId: user.id,
        recommendationId: allRecommendations[0].id,
      },
    })
    console.log('✅ Created sample likes')
  }

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
