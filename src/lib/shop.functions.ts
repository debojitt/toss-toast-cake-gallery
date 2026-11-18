import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const cakeInput = z.object({
  id: z.string().uuid(),
  storagePath: z.string().regex(/^cakes\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/),
});

async function getPublicDb() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("The cake gallery is temporarily unavailable.");
  const { makePublicClient } = await import("./shop.server");
  return makePublicClient(url, key);
}

async function getOwnerPassword(sessionSecret: string) {
  const { ownerSession } = await import("./shop.server");
  const session = await ownerSession(sessionSecret);
  const password = session.data.password;
  const expected = process.env["SITE_PASSWORD"];
  const { shopPasswordMatches } = await import("./shop-password.server");
  if (!password || !expected || !shopPasswordMatches(password, expected)) return null;
  return password;
}

export const listCakes = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getPublicDb();
  const { data, error } = await db
    .from("cake_images")
    .select("id, storage_path, is_featured, sort_order, created_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("The cake gallery is temporarily unavailable.");
  if (!data?.length) return [];

  const { data: signed, error: signedError } = await db.storage
    .from("toss-and-toast-cakes")
    .createSignedUrls(data.map((cake) => cake.storage_path), 60 * 60 * 24);
  if (signedError) throw new Error("Cake photos could not be loaded.");

  return data.flatMap((cake, index) => {
    const imageUrl = signed?.[index]?.signedUrl;
    return imageUrl ? [{ ...cake, imageUrl }] : [];
  });
});

export const getOwnerStatus = createServerFn({ method: "GET" }).handler(async () => {
  const sessionSecret = process.env["SESSION_SECRET"];
  if (!sessionSecret) return { unlocked: false };
  return { unlocked: (await getOwnerPassword(sessionSecret)) !== null };
});

export const ownerSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ password: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const sessionSecret = process.env["SESSION_SECRET"];
    const expected = process.env["SITE_PASSWORD"];
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!sessionSecret || !expected || !url || !key) return { ok: false };

    const { shopPasswordMatches } = await import("./shop-password.server");
    const matches = shopPasswordMatches(data.password, expected);
    const db = await getPublicDb();
    const { data: allowed, error } = await db.rpc("cake_password_is_valid", {
      _password: data.password,
    });
    if (error || !matches || !allowed) return { ok: false };

    const { ownerSession } = await import("./shop.server");
    const session = await ownerSession(sessionSecret);
    await session.update({ password: data.password });
    return { ok: true };
  });

export const ownerSignOut = createServerFn({ method: "POST" }).handler(async () => {
  const sessionSecret = process.env["SESSION_SECRET"];
  if (!sessionSecret) return { ok: true };
  const { ownerSession } = await import("./shop.server");
  await (await ownerSession(sessionSecret)).clear();
  return { ok: true };
});

export const reserveCakeUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ storagePath: cakeInput.shape.storagePath, mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(10 * 1024 * 1024) }).parse(input))
  .handler(async ({ data }) => {
    const secret = process.env["SESSION_SECRET"];
    if (!secret) throw new Error("Please sign in again to upload photos.");
    const password = await getOwnerPassword(secret);
    if (!password) throw new Error("Please sign in again to upload photos.");
    const db = await getPublicDb();
    const { data: reserved, error } = await db.rpc("reserve_cake_upload", {
      _password: password,
      _storage_path: data.storagePath,
    });
    if (error || !reserved) throw new Error("The photo upload could not be authorized.");
    return { ok: true as const };
  });

export const publishCakeUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ storagePath: cakeInput.shape.storagePath }).parse(input))
  .handler(async ({ data }) => {
    const secret = process.env["SESSION_SECRET"];
    if (!secret) throw new Error("Please sign in again to publish photos.");
    const password = await getOwnerPassword(secret);
    if (!password) throw new Error("Please sign in again to publish photos.");
    const db = await getPublicDb();
    const { data: id, error } = await db.rpc("publish_cake_upload", {
      _password: password,
      _storage_path: data.storagePath,
      _is_featured: false,
    });
    if (error || !id) throw new Error("The photo could not be added to the gallery.");
    return { id };
  });

export const setCakeFeatured = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ cakeId: z.string().uuid(), featured: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const secret = process.env["SESSION_SECRET"];
    if (!secret) throw new Error("Please sign in again to manage cakes.");
    const password = await getOwnerPassword(secret);
    if (!password) throw new Error("Please sign in again to manage cakes.");
    const db = await getPublicDb();
    const { data: saved, error } = await db.rpc("set_cake_featured", {
      _password: password,
      _cake_id: data.cakeId ?? undefined,
      _is_featured: data.featured,
    });
    if (error || !saved) throw new Error("The cake could not be updated.");
    return { ok: true as const };
  });

export const removeCake = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ cakeId: z.string().uuid(), storagePath: cakeInput.shape.storagePath }).parse(input))
  .handler(async ({ data }) => {
    const secret = process.env["SESSION_SECRET"];
    if (!secret) throw new Error("Please sign in again to manage cakes.");
    const password = await getOwnerPassword(secret);
    if (!password) throw new Error("Please sign in again to manage cakes.");
    const db = await getPublicDb();
    const { data: reserved, error: reserveError } = await db.rpc("reserve_cake_delete", {
      _password: password,
      _storage_path: data.storagePath,
    });
    if (reserveError || !reserved) throw new Error("The cake could not be removed.");
    const { error: storageError } = await db.storage.from("toss-and-toast-cakes").remove([data.storagePath]);
    if (storageError) throw new Error("The photo could not be removed. Please try again.");
    const { data: hidden, error } = await db.rpc("hide_cake", {
      _password: password,
      _cake_id: data.cakeId,
    });
    if (error || !hidden) throw new Error("The cake was removed, but its gallery entry could not be updated.");
    return { ok: true as const };
  });

export const createBirthdayLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    relationship: z.enum(["girlfriend", "best_friend", "friend", "sister", "brother"]),
    recipientName: z.string().trim().min(1).max(60),
    senderName: z.string().trim().min(1).max(60),
    cakeId: z.string().uuid().nullable(),
  }).parse(input))
  .handler(async ({ data }) => {
    const db = await getPublicDb();
    const { data: slug, error } = await db.rpc("create_birthday_link", {
      _relationship: data.relationship,
      _recipient_name: data.recipientName,
      _sender_name: data.senderName,
      _cake_id: data.cakeId,
    });
    if (error || !slug) throw new Error("Your birthday surprise could not be saved.");
    return { slug };
  });

export const getBirthdayLink = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().regex(/^[a-f0-9]{32}$/) }).parse(input))
  .handler(async ({ data }) => {
    const db = await getPublicDb();
    const { data: gifts, error } = await db.rpc("get_birthday_link", { _slug: data.slug });
    if (error) throw new Error("This birthday surprise could not be opened.");
    const gift = gifts?.[0];
    if (!gift) return null;
    let cakeUrl: string | null = null;
    if (gift.cake_path) {
      const { data: signed, error: signedError } = await db.storage
        .from("toss-and-toast-cakes")
        .createSignedUrl(gift.cake_path, 60 * 60 * 24);
      if (!signedError) cakeUrl = signed.signedUrl;
    }
    return { ...gift, cakeUrl };
  });

export const saveBirthdayAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().regex(/^[a-f0-9]{32}$/), answer: z.string().trim().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const db = await getPublicDb();
    const { data: saved, error } = await db.rpc("record_birthday_answer", {
      _slug: data.slug,
      _answer: data.answer,
    });
    if (error || !saved) throw new Error("Your answer could not be saved. Please try again.");
    return { ok: true as const };
  });

export const listBirthdayLinks = createServerFn({ method: "GET" }).handler(async () => {
  const sessionSecret = process.env["SESSION_SECRET"];
  if (!sessionSecret) return [];
  const password = await getOwnerPassword(sessionSecret);
  if (!password) return [];
  const db = await getPublicDb();
  const { data, error } = await db.rpc("list_birthday_links", { _password: password });
  if (error) throw new Error("Saved birthday links could not be loaded.");
  return data ?? [];
});
