CREATE TABLE public.cake_delete_reservations (
  storage_path text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
GRANT ALL ON public.cake_delete_reservations TO service_role;
ALTER TABLE public.cake_delete_reservations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_cake_delete(_password text, _storage_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.cake_password_is_valid(_password)
     OR NOT EXISTS (SELECT 1 FROM public.cake_images WHERE storage_path = _storage_path AND is_active = true) THEN
    RETURN false;
  END IF;
  INSERT INTO public.cake_delete_reservations(storage_path, expires_at)
  VALUES (_storage_path, now() + interval '10 minutes')
  ON CONFLICT (storage_path) DO UPDATE SET expires_at = EXCLUDED.expires_at;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_cake_delete(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_cake_delete(text, text) TO anon, authenticated;

CREATE POLICY "Reserved uploads can be cleaned up" ON storage.objects
FOR DELETE TO anon, authenticated USING (
  bucket_id = 'toss-and-toast-cakes' AND public.cake_upload_is_reserved(name)
);
CREATE POLICY "Only password-authorized cake photos can be removed" ON storage.objects
FOR DELETE TO anon, authenticated USING (
  bucket_id = 'toss-and-toast-cakes' AND EXISTS (
    SELECT 1 FROM public.cake_delete_reservations d
    WHERE d.storage_path = name AND d.expires_at > now()
  )
);