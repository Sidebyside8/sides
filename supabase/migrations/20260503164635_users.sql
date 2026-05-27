CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  age integer CHECK (age >= 18 AND age <= 100),
  location geography(Point, 4326),
  location_name text,
  looking_for text[] DEFAULT '{}',
  relationship_type text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);