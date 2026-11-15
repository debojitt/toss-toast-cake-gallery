CREATE TABLE public.cake_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cake_images TO service_role;
ALTER TABLE public.cake_images ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.birthday_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  relationship text NOT NULL CHECK (relationship IN ('girlfriend', 'best_friend', 'friend', 'sister', 'brother')),
  recipient_name text NOT NULL,
  sender_name text NOT NULL,
  cake_id uuid REFERENCES public.cake_images(id) ON DELETE SET NULL,
  game_answer text,
  played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.birthday_links TO service_role;
ALTER TABLE public.birthday_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX cake_images_sort_order_idx ON public.cake_images (sort_order, created_at DESC);
CREATE INDEX birthday_links_created_at_idx ON public.birthday_links (created_at DESC);