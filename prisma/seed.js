const { PrismaClient } = require('@prisma/client')

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
      description: 'Amazing authentic pasta and incredible tiramisu! This cozy restaurant in the heart of downtown offers the best Italian cuisine I\'ve had outside of Italy.',
      category: 'RESTAURANT',
      rating: 5,
      link: 'https://example.com/italian-corner',
      imageUrl: null,
      userId: user.id,
    },
    {
      title: 'Oppenheimer',
      description: 'A masterpiece of cinema. Must watch in IMAX! Christopher Nolan delivers a powerful biographical thriller.',
      category: 'MOVIE',
      rating: 5,
      link: 'https://www.imdb.com/title/tt15398776/',
      imageUrl: null,
      userId: user.id,
    },
    {
      title: 'Minimalist Backpack',
      description: 'Perfect for daily commute, durable and stylish.',
      category: 'FASHION',
      rating: 4,
      link: 'https://example.com/minimalist-backpack',
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
