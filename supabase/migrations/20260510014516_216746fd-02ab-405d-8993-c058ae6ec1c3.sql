
-- Threads
CREATE TABLE public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  categorie TEXT NOT NULL CHECK (categorie IN ('scoutisme','droits','environnement','sante','general')),
  user_id UUID NOT NULL,
  est_epingle BOOLEAN NOT NULL DEFAULT false,
  est_resolu BOOLEAN NOT NULL DEFAULT false,
  est_ferme BOOLEAN NOT NULL DEFAULT false,
  nb_vues INTEGER NOT NULL DEFAULT 0,
  nb_likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads threads" ON public.forum_threads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own threads" ON public.forum_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own threads" ON public.forum_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any thread" ON public.forum_threads
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own threads" ON public.forum_threads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any thread" ON public.forum_threads
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_forum_threads_updated
  BEFORE UPDATE ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_forum_threads_categorie ON public.forum_threads(categorie);
CREATE INDEX idx_forum_threads_created ON public.forum_threads(created_at DESC);

-- Replies
CREATE TABLE public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  contenu TEXT NOT NULL,
  est_meilleure_reponse BOOLEAN NOT NULL DEFAULT false,
  nb_likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads replies" ON public.forum_replies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own replies" ON public.forum_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own replies" ON public.forum_replies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any reply" ON public.forum_replies
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own replies" ON public.forum_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any reply" ON public.forum_replies
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_forum_replies_thread ON public.forum_replies(thread_id);

-- Likes
CREATE TABLE public.forum_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT forum_likes_target_check CHECK (
    (thread_id IS NOT NULL AND reply_id IS NULL) OR
    (thread_id IS NULL AND reply_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX forum_likes_user_thread_uniq ON public.forum_likes(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX forum_likes_user_reply_uniq ON public.forum_likes(user_id, reply_id) WHERE reply_id IS NOT NULL;

ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads likes" ON public.forum_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own likes" ON public.forum_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.forum_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Signalements
CREATE TABLE public.forum_signalements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  raison TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_signalements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own signalements" ON public.forum_signalements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own signalements" ON public.forum_signalements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all signalements" ON public.forum_signalements
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete signalements" ON public.forum_signalements
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
