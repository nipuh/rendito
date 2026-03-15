-- Fix: Add UPDATE policy for swipes table
-- The upsert() call (INSERT ... ON CONFLICT DO UPDATE) requires UPDATE permission.
-- Without this policy, all swipes silently fail when RLS is enabled.

CREATE POLICY "Users can update own swipes"
  ON public.swipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
