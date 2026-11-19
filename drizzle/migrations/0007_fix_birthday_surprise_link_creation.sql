CREATE OR REPLACE FUNCTION public.create_birthday_link(_relationship text, _recipient_name text, _sender_name text, _cake_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_slug text := encode(extensions.gen_random_bytes(16), 'hex');
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