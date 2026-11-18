CREATE OR REPLACE FUNCTION public.reserve_cake_upload(_password text, _storage_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.cake_password_is_valid(_password)
     OR _storage_path !~ '^cakes/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp)$' THEN
    RETURN false;
  END IF;
  INSERT INTO public.cake_upload_reservations(storage_path, expires_at)
  VALUES (_storage_path, now() + interval '10 minutes')
  ON CONFLICT (storage_path) DO NOTHING;
  RETURN true;
END;
$$;