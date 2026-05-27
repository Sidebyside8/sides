CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  cloudinary_id text,
  is_primary boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);