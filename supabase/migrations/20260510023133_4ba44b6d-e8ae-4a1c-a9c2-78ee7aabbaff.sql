
CREATE TABLE public.evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('camp','formation','national','local','urgent')),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  lieu TEXT,
  region TEXT NOT NULL DEFAULT 'National',
  responsable TEXT,
  nb_places INTEGER NOT NULL DEFAULT 0,
  nb_inscrits INTEGER NOT NULL DEFAULT 0,
  lien_externe TEXT,
  google_calendar_id TEXT,
  rappel_email BOOLEAN NOT NULL DEFAULT true,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.evenements_inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evenement_id UUID NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  statut TEXT NOT NULL DEFAULT 'inscrit' CHECK (statut IN ('inscrit','liste_attente','annule')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evenement_id, user_id)
);

ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements_inscriptions ENABLE ROW LEVEL SECURITY;

-- evenements policies
CREATE POLICY "Anyone reads visible events" ON public.evenements
  FOR SELECT USING (visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated insert events" ON public.evenements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin update events" ON public.evenements
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin delete events" ON public.evenements
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- inscriptions policies
CREATE POLICY "Users view own inscriptions" ON public.evenements_inscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all inscriptions" ON public.evenements_inscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own inscriptions" ON public.evenements_inscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own inscriptions" ON public.evenements_inscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_evenements_updated_at
  BEFORE UPDATE ON public.evenements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_evenements_date_debut ON public.evenements(date_debut);
CREATE INDEX idx_inscriptions_user ON public.evenements_inscriptions(user_id);

-- Seed
INSERT INTO public.evenements (titre, description, type, date_debut, date_fin, lieu, region, responsable, nb_places) VALUES
('Camp régional de Dakar 2026', 'Camp annuel régional avec 80 scouts. Thème : Citoyenneté et engagement communautaire.', 'camp', CURRENT_DATE + 5, CURRENT_DATE + 8, 'Centre scout de Pikine, Dakar', 'Dakar', 'Chef Moussa Diop', 80),
('Formation chefs de patrouille', 'Formation nationale pour les nouveaux chefs. Gestion d''équipe, pédagogie scout.', 'formation', CURRENT_DATE + 10, CURRENT_DATE + 10, 'Siège EEDS, Dakar', 'National', 'Direction EEDS', 40),
('Journée mondiale du scoutisme', 'Célébration nationale avec toutes les régions. Défilé et remise de badges.', 'national', CURRENT_DATE + 14, CURRENT_DATE + 14, 'Stade Iba Mar Diop, Dakar', 'National', 'Présidence EEDS', 500),
('Camp Casamance Vert', 'Camp environnemental. Plantation d''arbres et sensibilisation écologique.', 'camp', CURRENT_DATE + 20, CURRENT_DATE + 24, 'Forêt de Ziguinchor', 'Ziguinchor', 'Chef Régional Casamance', 45),
('Atelier droits de l''enfant', 'Atelier interactif Convention ONU des droits de l''enfant pour éclaireurs.', 'local', CURRENT_DATE + 7, CURRENT_DATE + 7, 'Maison des jeunes de Thiès', 'Thiès', 'Chef Aïssatou Ndiaye', 30),
('Réunion nationale des chefs scouts', 'Réunion annuelle de tous les chefs régionaux EEDS. Bilan et planification.', 'national', CURRENT_DATE + 32, CURRENT_DATE + 32, 'Hôtel Radisson, Dakar', 'National', 'Secrétaire Général EEDS', 60);
