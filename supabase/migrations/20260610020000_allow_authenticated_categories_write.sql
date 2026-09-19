-- Drop restriction policy
DROP POLICY IF EXISTS "categories admin write" ON public.categories;

-- Create policy to allow authenticated users to write categories
CREATE POLICY "categories authenticated write" ON public.categories 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);
