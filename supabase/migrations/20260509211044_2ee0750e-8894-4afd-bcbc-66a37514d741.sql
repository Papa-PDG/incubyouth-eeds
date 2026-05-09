
-- Tables
CREATE TABLE public.ressources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  categorie TEXT NOT NULL,
  fichier_url TEXT,
  couverture_url TEXT,
  nb_pages INTEGER NOT NULL DEFAULT 0,
  nb_telechargements INTEGER NOT NULL DEFAULT 0,
  taille_mo NUMERIC(5,1) NOT NULL DEFAULT 0,
  annee INTEGER NOT NULL DEFAULT 2024,
  est_nouveau BOOLEAN NOT NULL DEFAULT false,
  est_populaire BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  visible BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ressources_favoris (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ressource_id UUID NOT NULL REFERENCES public.ressources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ressource_id)
);

CREATE TABLE public.ressources_telechargements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ressource_id UUID NOT NULL REFERENCES public.ressources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ressources_categorie ON public.ressources(categorie);
CREATE INDEX idx_ressources_visible ON public.ressources(visible);
CREATE INDEX idx_favoris_user ON public.ressources_favoris(user_id);

-- Updated_at trigger
CREATE TRIGGER trg_ressources_updated_at
BEFORE UPDATE ON public.ressources
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.ressources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ressources_favoris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ressources_telechargements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read visible resources"
  ON public.ressources FOR SELECT TO authenticated
  USING (visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert resources"
  ON public.ressources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update resources"
  ON public.ressources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete resources"
  ON public.ressources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own favorites"
  ON public.ressources_favoris FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own favorites"
  ON public.ressources_favoris FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own favorites"
  ON public.ressources_favoris FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own downloads"
  ON public.ressources_telechargements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all downloads"
  ON public.ressources_telechargements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own downloads"
  ON public.ressources_telechargements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ressources-eeds', 'ressources-eeds', true, 52428800,
        ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read ressources-eeds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ressources-eeds');

CREATE POLICY "Admins upload ressources-eeds"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ressources-eeds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update ressources-eeds"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ressources-eeds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete ressources-eeds"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ressources-eeds' AND public.has_role(auth.uid(), 'admin'));
