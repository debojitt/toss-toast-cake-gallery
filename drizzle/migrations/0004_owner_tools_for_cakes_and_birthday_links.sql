CREATE OR REPLACE FUNCTION public.set_cake_featured(_password text, _cake_id uuid, _is_featured boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.cake_password_is_valid(_password) THEN RETURN false; END IF;
  UPDATE public.cake_images SET is_featured = _is_featured WHERE id = _cake_id AND is_active = true;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.set_cake_featured(text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_cake_featured(text, uuid, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_birthday_links(_password text)
RETURNS TABLE (slug text, relationship text, recipient_name text, sender_name text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.cake_password_is_valid(_password) THEN RETURN; END IF;
  RETURN QUERY SELECT b.slug, b.relationship, b.recipient_name, b.sender_name, b.created_at
    FROM public.birthday_links b ORDER BY b.created_at DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.list_birthday_links(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_birthday_links(text) TO anon, authenticated;