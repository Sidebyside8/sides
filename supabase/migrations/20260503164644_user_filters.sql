CREATE TABLE public.user_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  min_age integer DEFAULT 18,
  max_age integer DEFAULT 99,
  max_distance_km integer DEFAULT 50,
  looking_for text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);