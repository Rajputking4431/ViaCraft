-- Seed default categories
INSERT INTO public.categories (name, slug, image_url, sort_order)
VALUES
  ('Resin Clocks', 'resin-clocks', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', 0),
  ('Resin Trays', 'resin-trays', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80', 1),
  ('Resin Coasters', 'resin-coasters', 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=150&auto=format&fit=crop&q=80', 2),
  ('Resin Jewelry', 'resin-jewelry', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=150&auto=format&fit=crop&q=80', 3),
  ('Car Hanging', 'car-hanging', 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=150&auto=format&fit=crop&q=80', 4),
  ('Resin Keychains', 'resin-keychains', 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=150&auto=format&fit=crop&q=80', 5),
  ('Baby Casting', 'baby-casting', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&auto=format&fit=crop&q=80', 6),
  ('Preservation', 'preservation', 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=150&auto=format&fit=crop&q=80', 7),
  ('Candle Art', 'candle-art', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=150&auto=format&fit=crop&q=80', 8),
  ('Resin Tables', 'resin-tables', 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=150&auto=format&fit=crop&q=80', 9),
  ('Gift Sets', 'gift-sets', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&auto=format&fit=crop&q=80', 10),
  ('Premium Collection', 'premium-collection', 'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=150&auto=format&fit=crop&q=80', 11)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  image_url = EXCLUDED.image_url,
  sort_order = EXCLUDED.sort_order;
