-- Table sauvegardes
CREATE TABLE IF NOT EXISTS public.forum_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, thread_id)
);

ALTER TABLE public.forum_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saves"
  ON public.forum_saves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own saves"
  ON public.forum_saves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own saves"
  ON public.forum_saves FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_forum_saves_user ON public.forum_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_saves_thread ON public.forum_saves(thread_id);

-- RPC: auteurs publics du forum (prenom, nom, region, post_count)
CREATE OR REPLACE FUNCTION public.get_forum_authors(_ids uuid[])
RETURNS TABLE (
  id uuid,
  prenom text,
  nom text,
  region text,
  post_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.prenom,
    p.nom,
    p.region,
    COALESCE((SELECT COUNT(*)::int FROM public.forum_threads t WHERE t.user_id = p.id), 0) AS post_count
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_forum_authors(uuid[]) TO authenticated;