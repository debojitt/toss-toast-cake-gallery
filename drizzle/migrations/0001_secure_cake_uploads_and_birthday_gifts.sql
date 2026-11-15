CREATE TABLE public.shop_access_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL
);
GRANT ALL ON public.shop_access_config TO service_role;
ALTER TABLE public.shop_access_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cake_upload_reservations (
  storage_path text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
GRANT ALL ON public.cake_upload_reservations TO service_role;
ALTER TABLE public.cake_upload_reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cake_images ADD COLUMN is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.cake_password_is_valid(_password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_access_config
    WHERE id = 1 AND password_hash = extensions.crypt(_password, password_hash)
  );
$$;
REVOKE ALL ON FUNCTION public.cake_password_is_valid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cake_password_is_valid(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_cake_upload(_password text, _storage_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.cake_password_is_valid(_password)
     OR _storage_path !~ '^cakes/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp)$' THEN
    RETURN false;
  END IF;
  INSERT INTO public.cake_upload_reservations(storage_path, expires_at)
  VALUES (_storage_path, now() + interval '10 minutes')
  ON CONFLICT (storage_path) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_cake_upload(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_cake_upload(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cake_upload_is_reserved(_storage_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cake_upload_reservations
    WHERE storage_path = _storage_path AND expires_at > now()
  );
$$;
REVOKE ALL ON FUNCTION public.cake_upload_is_reserved(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cake_upload_is_reserved(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_cake_upload(_password text, _storage_path text, _is_featured boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.cake_password_is_valid(_password) OR NOT public.cake_upload_is_reserved(_storage_path) THEN
    RAISE EXCEPTION 'Upload authorization expired';
  END IF;
  DELETE FROM public.cake_upload_reservations WHERE storage_path = _storage_path;
  INSERT INTO public.cake_images(storage_path, is_featured, sort_order)
  VALUES (_storage_path, _is_featured, (SELECT COALESCE(max(sort_order), 0) + 1 FROM public.cake_images))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_cake_upload(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_cake_upload(text, text, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.hide_cake(_password text, _cake_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.cake_password_is_valid(_password) THEN RETURN false; END IF;
  UPDATE public.cake_images SET is_active = false WHERE id = _cake_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.hide_cake(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hide_cake(text, uuid) TO anon, authenticated;

CREATE POLICY "Public can view active cake images" ON public.cake_images
FOR SELECT TO anon, authenticated USING (is_active = true);
GRANT SELECT ON public.cake_images TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_birthday_link(_relationship text, _recipient_name text, _sender_name text, _cake_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_slug text := encode(gen_random_bytes(16), 'hex');
BEGIN
  IF _relationship NOT IN ('girlfriend', 'best_friend', 'friend', 'sister', 'brother')
     OR length(trim(_recipient_name)) NOT BETWEEN 1 AND 60
     OR length(trim(_sender_name)) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Please provide a valid birthday message';
  END IF;
  INSERT INTO public.birthday_links(slug, relationship, recipient_name, sender_name, cake_id)
  VALUES (new_slug, _relationship, trim(_recipient_name), trim(_sender_name), _cake_id);
  RETURN new_slug;
END;
$$;
REVOKE ALL ON FUNCTION public.create_birthday_link(text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_birthday_link(text, text, text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_birthday_link(_slug text)
RETURNS TABLE (recipient_name text, sender_name text, relationship text, cake_path text, game_answer text, played_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.recipient_name, b.sender_name, b.relationship, c.storage_path, b.game_answer, b.played_at
  FROM public.birthday_links b
  LEFT JOIN public.cake_images c ON c.id = b.cake_id AND c.is_active = true
  WHERE b.slug = _slug;
$$;
REVOKE ALL ON FUNCTION public.get_birthday_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_birthday_link(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_birthday_answer(_slug text, _answer text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(_answer) > 120 THEN RETURN false; END IF;
  UPDATE public.birthday_links SET game_answer = trim(_answer), played_at = now() WHERE slug = _slug;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.record_birthday_answer(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_birthday_answer(text, text) TO anon, authenticated;

CREATE POLICY "Only reserved cake uploads are accepted" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (
  bucket_id = 'toss-and-toast-cakes' AND public.cake_upload_is_reserved(name)
);
CREATE POLICY "Only active catalogue cakes can be viewed" ON storage.objects
FOR SELECT TO anon, authenticated USING (
  bucket_id = 'toss-and-toast-cakes' AND EXISTS (
    SELECT 1 FROM public.cake_images c WHERE c.storage_path = name AND c.is_active = true
  )
);