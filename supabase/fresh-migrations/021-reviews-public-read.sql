-- Allow everyone (including visitors not logged in) to read reviews on the home page
-- (SELECT policy on reviews is defined in reviews.sql — do not recreate it here)

-- Let visitors see reviewer display names on the home page (only users with a review)
DROP POLICY IF EXISTS "Public can view reviewer profiles" ON public.profiles;
CREATE POLICY "Public can view reviewer profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.reviews WHERE user_id = profiles.id));
