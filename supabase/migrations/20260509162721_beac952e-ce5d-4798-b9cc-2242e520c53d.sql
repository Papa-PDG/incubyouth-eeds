CREATE TABLE public.camps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nom_camp text NOT NULL,
  duree integer NOT NULL,
  theme text NOT NULL,
  effectif text NOT NULL,
  age text NOT NULL,
  region text NOT NULL,
  plan_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own camps"
  ON public.camps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own camps"
  ON public.camps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own camps"
  ON public.camps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all camps"
  ON public.camps FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_camps_user_created ON public.camps(user_id, created_at DESC);