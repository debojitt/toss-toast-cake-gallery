ALTER TABLE public.shop_access_config
  ADD COLUMN failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN locked_until timestamptz;

CREATE OR REPLACE FUNCTION public.cake_password_is_valid(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE matched boolean;
DECLARE current_lock timestamptz;
DECLARE current_failures integer;
BEGIN
  SELECT locked_until, failed_attempts
  INTO current_lock, current_failures
  FROM public.shop_access_config WHERE id = 1 FOR UPDATE;
  IF NOT FOUND OR (current_lock IS NOT NULL AND current_lock > now()) THEN RETURN false; END IF;
  IF current_lock IS NOT NULL AND current_lock <= now() THEN
    UPDATE public.shop_access_config SET locked_until = NULL, failed_attempts = 0 WHERE id = 1;
    current_failures := 0;
  END IF;
  SELECT password_hash = extensions.crypt(_password, password_hash)
  INTO matched FROM public.shop_access_config WHERE id = 1;
  IF matched THEN
    UPDATE public.shop_access_config SET failed_attempts = 0, locked_until = NULL WHERE id = 1;
    RETURN true;
  END IF;
  current_failures := COALESCE(current_failures, 0) + 1;
  UPDATE public.shop_access_config
  SET failed_attempts = current_failures,
      locked_until = CASE WHEN current_failures >= 5 THEN now() + interval '5 minutes' ELSE NULL END
  WHERE id = 1;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_cake_upload(_password text, _storage_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.cake_password_is_valid(_password)
     OR _storage_path !~ '^cakes/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' THEN
    RETURN false;
  END IF;
  INSERT INTO public.cake_upload_reservations(storage_path, expires_at)
  VALUES (_storage_path, now() + interval '10 minutes')
  ON CONFLICT (storage_path) DO NOTHING;
  RETURN true;
END;
$$;

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