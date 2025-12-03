-- Insert a demo user
INSERT INTO "User" (id, email, name, "createdAt", "updatedAt") 
VALUES ('demo-user-1', 'demo@clique.app', 'Demo User', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert sample recommendations
INSERT INTO "Recommendation" (id, title, description, category, rating, link, "userId", "createdAt", "updatedAt")
VALUES 
('rec-1', 'The Italian Corner', 'Amazing authentic pasta and incredible tiramisu! This cozy restaurant in the heart of downtown offers the best Italian cuisine.', 'RESTAURANT', 5, 'https://example.com/italian-corner', 'demo-user-1', NOW(), NOW()),
('rec-2', 'Oppenheimer', 'A masterpiece of cinema. Must watch in IMAX! Christopher Nolan delivers a powerful biographical thriller.', 'MOVIE', 5, 'https://www.imdb.com/title/tt15398776/', 'demo-user-1', NOW(), NOW()),
('rec-3', 'Minimalist Backpack', 'Perfect for daily commute, durable and stylish. This sleek backpack combines functionality with minimalist design.', 'FASHION', 4, 'https://example.com/backpack', 'demo-user-1', NOW(), NOW());
