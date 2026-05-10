-- Restrict event management to admins only
DROP POLICY IF EXISTS "Authenticated insert events" ON public.evenements;
DROP POLICY IF EXISTS "Owner or admin update events" ON public.evenements;
DROP POLICY IF EXISTS "Owner or admin delete events" ON public.evenements;

CREATE POLICY "Admins insert events"
ON public.evenements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update events"
ON public.evenements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete events"
ON public.evenements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));