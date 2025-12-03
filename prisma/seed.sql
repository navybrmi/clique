-- Insert a demo user
INSERT INTO "User" (id, email, name, "createdAt", "updatedAt") 
VALUES ('demo-user-1', 'demo@clique.app', 'Demo User', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert sample recommendations with category-specific fields
-- Restaurant recommendation
INSERT INTO "Recommendation" (id, title, description, category, rating, link, "imageUrl", cuisine, location, "priceRange", hours, "userId", "createdAt", "updatedAt")
VALUES 
('rec-1', 'The Italian Corner', 'Amazing authentic pasta and incredible tiramisu! This cozy restaurant in the heart of downtown offers the best Italian cuisine with a romantic ambiance.', 'RESTAURANT', 9, 'https://example.com/italian-corner', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'Italian', '123 Main St, Downtown', '$$-$$$', 'Mon-Sun: 11:30 AM - 10:00 PM', 'demo-user-1', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  rating = EXCLUDED.rating,
  link = EXCLUDED.link,
  "imageUrl" = EXCLUDED."imageUrl",
  cuisine = EXCLUDED.cuisine,
  location = EXCLUDED.location,
  "priceRange" = EXCLUDED."priceRange",
  hours = EXCLUDED.hours;

-- Movie recommendation
INSERT INTO "Recommendation" (id, title, description, category, rating, link, "imageUrl", director, year, genre, duration, "userId", "createdAt", "updatedAt")
VALUES 
('rec-2', 'Oppenheimer', 'A masterpiece of cinema. Must watch in IMAX! Christopher Nolan delivers a powerful biographical thriller about the father of the atomic bomb.', 'MOVIE', 10, 'https://www.imdb.com/title/tt15398776/', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800', 'Christopher Nolan', 2023, 'Biography, Drama, History', '3h 0min', 'demo-user-1', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  rating = EXCLUDED.rating,
  link = EXCLUDED.link,
  "imageUrl" = EXCLUDED."imageUrl",
  director = EXCLUDED.director,
  year = EXCLUDED.year,
  genre = EXCLUDED.genre,
  duration = EXCLUDED.duration;

-- Fashion recommendation
INSERT INTO "Recommendation" (id, title, description, category, rating, link, "imageUrl", brand, price, size, color, "userId", "createdAt", "updatedAt")
VALUES 
('rec-3', 'Minimalist Backpack', 'Perfect for daily commute, durable and stylish. This sleek backpack combines functionality with minimalist design. Water-resistant and laptop-friendly.', 'FASHION', 8, 'https://example.com/backpack', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 'Peak Design', '$149.99', 'One Size', 'Charcoal', 'demo-user-1', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  rating = EXCLUDED.rating,
  link = EXCLUDED.link,
  "imageUrl" = EXCLUDED."imageUrl",
  brand = EXCLUDED.brand,
  price = EXCLUDED.price,
  size = EXCLUDED.size,
  color = EXCLUDED.color;
