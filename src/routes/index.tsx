import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Copy,
  Heart,
  Link2,
  LockKeyhole,
  MessageCircle,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import logoAsset from "@/assets/toss-toast-logo.jpg.asset.json";
import heroImage from "@/assets/toss-toast-cake-hero.jpg";
import {
  createBirthdayLink,
  getOwnerStatus,
  listBirthdayLinks,
  listCakes,
  ownerSignIn,
  ownerSignOut,
  publishCakeUpload,
  removeCake,
  reserveCakeUpload,
  setCakeFeatured,
} from "@/lib/shop.functions";

type Cake = Awaited<ReturnType<typeof listCakes>>[number];
type BirthdayLink = Awaited<ReturnType<typeof listBirthdayLinks>>[number];
type Relation = "girlfriend" | "best_friend" | "friend" | "sister" | "brother";

const relationLabels: Record<Relation, string> = {
  girlfriend: "Girlfriend",
  best_friend: "Best friend",
  friend: "Friend",
  sister: "Sister",
  brother: "Brother",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toss & Toast — Cakes made for your kind of celebration" },
      { name: "description", content: "Explore custom celebration cakes and create a playful birthday surprise with Toss & Toast." },
      { property: "og:title", content: "Toss & Toast — Cakes made for your kind of celebration" },
      { property: "og:description", content: "A little cake, a lot of heart. Find a celebration cake or make a birthday surprise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [selectedCake, setSelectedCake] = useState<Cake | null>(null);
  const [birthdayCakeId, setBirthdayCakeId] = useState<string | null>(null);
  const [birthdayLinks, setBirthdayLinks] = useState<BirthdayLink[]>([]);
  const [newBirthdayUrl, setNewBirthdayUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [orderSize, setOrderSize] = useState("6 inch");
  const [orderDate, setOrderDate] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [relationship, setRelationship] = useState<Relation>("girlfriend");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const getCakes = useServerFn(listCakes);
  const getOwner = useServerFn(getOwnerStatus);
  const signIn = useServerFn(ownerSignIn);
  const signOut = useServerFn(ownerSignOut);
  const publishUpload = useServerFn(publishCakeUpload);
  const reserveUpload = useServerFn(reserveCakeUpload);
  const featureCake = useServerFn(setCakeFeatured);
  const removeOneCake = useServerFn(removeCake);
  const createBirthday = useServerFn(createBirthdayLink);
  const getBirthdayHistory = useServerFn(listBirthdayLinks);

  const refreshCakes = async () => {
    try {
      setCakes(await getCakes());
    } catch {
      toast.error("The cake gallery is having a little rest. Try refreshing.");
    }
  };

  useEffect(() => {
    void refreshCakes();
    void getOwner().then((result) => setOwnerUnlocked(result.unlocked));
  }, []);

  useEffect(() => {
    if (ownerUnlocked) void getBirthdayHistory().then(setBirthdayLinks).catch(() => undefined);
    else setBirthdayLinks([]);
  }, [ownerUnlocked]);

  const featuredCakes = useMemo(() => cakes.filter((cake) => cake.is_featured), [cakes]);
  const visibleCakes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return term ? cakes.filter((cake) => term && cake.id.toLocaleLowerCase().includes(term)) : cakes;
  }, [cakes, search]);

  async function signInOwner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await signIn({ data: { password: loginPassword } });
      if (!result.ok) {
        toast.error("That password didn’t open the shop tools.");
        return;
      }
      setOwnerUnlocked(true);
      setLoginPassword("");
      toast.success("Welcome back to the bakery!");
    } catch {
      toast.error("Shop tools are unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutOwner() {
    await signOut();
    setOwnerUnlocked(false);
    setOwnerOpen(false);
    toast.success("You’re signed out of the shop tools.");
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const allFiles = Array.from(files);
    if (allFiles.length > 50) {
      toast.error("Please upload up to 50 photos at a time.");
      return;
    }
    const accepted = allFiles.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    if (accepted.length !== allFiles.length) toast.error("Only JPG, PNG, or WebP photos up to 10 MB can be added.");
    if (!accepted.length) return;

    setBusy(true);
    let added = 0;
    try {
      for (const file of accepted) {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
        const storagePath = `cakes/${crypto.randomUUID()}.${extension}`;
        await reserveUpload({ data: { storagePath, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", size: file.size } });
        const { supabase } = await import("@/integrations/supabase/client");
        const { error: storageError } = await supabase.storage.from("toss-and-toast-cakes").upload(storagePath, file, { contentType: file.type, upsert: false });
        if (storageError) throw new Error("A photo could not be uploaded.");
        await publishUpload({ data: { storagePath } });
        added += 1;
      }
      await refreshCakes();
      toast.success(`${added} cake photo${added === 1 ? "" : "s"} added to the gallery!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Some photos could not be added.");
      await refreshCakes();
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function toggleFeatured(cake: Cake) {
    try {
      await featureCake({ data: { cakeId: cake.id, featured: !cake.is_featured } });
      await refreshCakes();
      toast.success(cake.is_featured ? "Removed from the cake carousel." : "Added to the cake carousel!");
    } catch {
      toast.error("That cake couldn’t be updated.");
    }
  }

  async function deleteCake(cake: Cake) {
    try {
      await removeOneCake({ data: { cakeId: cake.id, storagePath: cake.storage_path } });
      setSelectedCake(null);
      await refreshCakes();
      toast.success("Cake photo removed.");
    } catch {
      toast.error("That cake couldn’t be removed.");
    }
  }

  function orderMessage(cake: Cake) {
    const dateText = orderDate ? ` I’d love it for ${new Date(`${orderDate}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.` : "";
    const text = `Hi Toss & Toast! I’d love a custom cake inspired by this design. Cake reference: ${cake.id.slice(0, 8)}. Size: ${orderSize}.${dateText} Could you share the flavours and details?`;
    return `https://wa.me/919706050166?text=${encodeURIComponent(text)}`;
  }

  async function createBirthdaySurprise(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await createBirthday({ data: { relationship, recipientName, senderName, cakeId: birthdayCakeId } });
      const url = `${window.location.origin}/birthday/${result.slug}`;
      setNewBirthdayUrl(url);
      await getBirthdayHistory().then(setBirthdayLinks).catch(() => undefined);
      toast.success("Your birthday surprise is ready to share!");
    } catch {
      toast.error("That birthday surprise couldn’t be saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shop-shell min-h-screen bg-background text-foreground">
      <header className="shop-header">
        <a className="shop-brand" href="#top" aria-label="Toss & Toast home">
          <img src={logoAsset.url} alt="Toss & Toast" width={96} height={64} />
          <span className="shop-brand-caption">BAKED WITH A LITTLE EXTRA LOVE</span>
        </a>
        <nav className="shop-nav" aria-label="Main navigation">
          <a href="#cakes">The cake edit</a>
          <a href="#birthday">Birthday magic</a>
          <a className="shop-nav-whatsapp" href="https://wa.me/919706050166" target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
        </nav>
        <Button className="owner-trigger" variant="ghost" size="icon" aria-label="Open shop owner tools" title="Shop owner" onClick={() => setOwnerOpen(true)}>
          {ownerUnlocked ? <Sparkles /> : <LockKeyhole />}
        </Button>
      </header>

      <section id="top" className="cake-hero">
        <img className="cake-hero-photo" src={heroImage} alt="A table of pink, chocolate, and cream celebration cakes" width={1600} height={900} />
        <div className="cake-hero-shade" />
        <div className="cake-hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> LITTLE CAKES, BIG FEELINGS</span>
          <h1>Your next happy<br />begins with cake.</h1>
          <p>Made for the candles, the hugs, and the “just one more slice”.</p>
          <div className="hero-actions">
            <Button className="hero-cta" asChild><a href="#cakes">Find your cake <ArrowRight size={16} /></a></Button>
            <a className="hero-whatsapp" href="https://wa.me/919706050166?text=Hi%20Toss%20%26%20Toast!%20I%E2%80%99d%20love%20to%20ask%20about%20a%20custom%20cake." target="_blank" rel="noreferrer"><MessageCircle size={17} /> Chat with us</a>
          </div>
        </div>
        <div className="hero-sticker" aria-hidden="true"><span>freshly</span><strong>made<br />to make<br />your day</strong><Heart size={17} fill="currentColor" /></div>
        <a className="hero-scroll" href="#cakes"><ArrowDown size={14} /> SCROLL FOR THE GOOD STUFF</a>
      </section>

      <section className="featured-band" aria-label="Featured cake inspiration">
        <div className="featured-heading"><span>ON REPEAT</span><strong>Cake crushes</strong></div>
        <div className="featured-track" id="featured-track">
          {(featuredCakes.length ? featuredCakes : cakes.slice(0, 6)).map((cake) => (
            <button className="featured-tile" key={cake.id} onClick={() => setSelectedCake(cake)} aria-label="View this cake">
              <img src={cake.imageUrl} alt="" loading="lazy" />
              <span><Heart size={13} fill="currentColor" /> Customisable</span>
            </button>
          ))}
          {cakes.length === 0 && <div className="featured-empty"><Sparkles size={16} /> A little cake inspiration is on its way</div>}
        </div>
        <div className="featured-arrows">
          <Button variant="outline" size="icon" aria-label="Scroll cake carousel left" onClick={() => document.getElementById("featured-track")?.scrollBy({ left: -260, behavior: "smooth" })}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" aria-label="Scroll cake carousel right" onClick={() => document.getElementById("featured-track")?.scrollBy({ left: 260, behavior: "smooth" })}><ChevronRight /></Button>
        </div>
      </section>

      <section id="cakes" className="catalogue-section">
        <div className="catalogue-heading">
          <div>
            <span className="eyebrow catalogue-eyebrow">YOUR LITTLE CAKE MUSEUM</span>
            <h2>The cake <em>catalogue</em></h2>
            <p>Save your favourite for the next reason to celebrate.</p>
          </div>
          <div className="catalogue-controls">
            <label className="catalogue-search"><span className="sr-only">Search cake references</span><CakeSlice size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a cake" /></label>
            <span className="cake-count">{cakes.length} cake{cakes.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        {visibleCakes.length ? <div className="cake-grid">
          {visibleCakes.map((cake, index) => (
            <article className={`cake-card cake-card-${index % 4}`} key={cake.id}>
              <button className="cake-image-button" onClick={() => setSelectedCake(cake)} aria-label="Open custom cake options">
                <img src={cake.imageUrl} alt="Custom celebration cake inspiration" loading="lazy" />
                {cake.is_featured && <span className="cake-featured"><Star size={11} fill="currentColor" /> On repeat</span>}
                <span className="cake-image-open"><ArrowRight size={17} /></span>
              </button>
              <div className="cake-card-caption"><span>MADE FOR YOUR MOMENT</span><strong>Custom cake inspiration</strong><button onClick={() => setSelectedCake(cake)} aria-label="Order a similar cake"><ArrowRight size={17} /></button></div>
            </article>
          ))}
        </div> : <div className="catalogue-empty"><div className="empty-stamp"><CakeSlice size={32} /></div><h3>{search ? "No cakes with that reference yet" : "Our cake wall is waiting"}</h3><p>{search ? "Try a shorter search, or ask us for something from scratch." : "The next cake photo can be added in a little bulk upload."}</p><Button variant="outline" asChild><a href="https://wa.me/919706050166?text=Hi%20Toss%20%26%20Toast!%20I%E2%80%99d%20love%20to%20see%20your%20cake%20catalogue." target="_blank" rel="noreferrer">Ask about a cake <ArrowRight size={16} /></a></Button></div>}
      </section>

      <section id="birthday" className="birthday-band">
        <div className="birthday-art"><div className="birthday-art-photo"><img src={heroImage} alt="A lovingly decorated celebration cake" loading="lazy" width={1600} height={900} /></div><span className="birthday-sun" aria-hidden="true">✳</span><div className="birthday-seal"><Heart size={23} fill="currentColor" /><span>made<br />for you</span></div></div>
        <div className="birthday-copy">
          <span className="eyebrow"><Sparkles size={14} /> A LITTLE SURPRISE, JUST FOR THEM</span>
          <h2>Make their birthday<br /><em>feel like them.</em></h2>
          <p>Turn their name, your inside jokes, and a cake they’ll love into a sweet little birthday link—with a wish, a question, and a tiny game.</p>
          <Button className="birthday-cta" onClick={() => { setNewBirthdayUrl(""); setBirthdayOpen(true); }}><Heart size={16} /> Make a birthday surprise <ArrowRight size={16} /></Button>
          <span className="birthday-note"><Sparkles size={12} /> A shareable surprise that stays saved for them</span>
        </div>
      </section>

      <footer className="shop-footer">
        <a className="footer-brand" href="#top"><img src={logoAsset.url} alt="Toss & Toast" width={66} height={44} /></a>
        <span>Good things are better shared. Especially cake.</span>
        <a href="https://wa.me/919706050166" target="_blank" rel="noreferrer">Say hello <ArrowRight size={14} /></a>
      </footer>

      <Dialog open={Boolean(selectedCake)} onOpenChange={(open) => { if (!open) setSelectedCake(null); }}>
        <DialogContent className="cake-dialog">
          {selectedCake && <>
            <img className="cake-dialog-image" src={selectedCake.imageUrl} alt="Selected celebration cake inspiration" />
            <DialogHeader><span className="eyebrow">A LITTLE INSPIRATION GOES A LONG WAY</span><DialogTitle>Let’s make one like this.</DialogTitle><DialogDescription>Choose a size and date. We’ll put together a message with this cake reference for Toss & Toast.</DialogDescription></DialogHeader>
            <div className="order-fields"><label>Size<select value={orderSize} onChange={(event) => setOrderSize(event.target.value)}><option>6 inch</option><option>8 inch</option><option>10 inch</option><option>Custom size</option></select></label><label>Needed for (optional)<Input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} /></label></div>
            <Button asChild className="dialog-whatsapp"><a href={orderMessage(selectedCake)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Get a similar custom cake</a></Button>
            <p className="dialog-footnote">Your message will open in WhatsApp, ready for you to send.</p>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={birthdayOpen} onOpenChange={setBirthdayOpen}>
        <DialogContent className="birthday-dialog">
          {!newBirthdayUrl ? <>
            <DialogHeader><span className="eyebrow"><Sparkles size={13} /> MAKE A LITTLE MAGIC</span><DialogTitle>A birthday link, made just for them.</DialogTitle><DialogDescription>A personal wish, one playful question, and a cake picked with love.</DialogDescription></DialogHeader>
            <form className="birthday-form" onSubmit={createBirthdaySurprise}>
              <label>Who’s the birthday star?<select value={relationship} onChange={(event) => setRelationship(event.target.value as Relation)}>{Object.entries(relationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label>Their name<Input autoComplete="given-name" required maxLength={60} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="A very loved human" /></label>
              <label>From<Input required maxLength={60} value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Your name" /></label>
              <label>Pick their cake <select value={birthdayCakeId ?? ""} onChange={(event) => setBirthdayCakeId(event.target.value || null)}><option value="">A sweet surprise</option>{cakes.map((cake) => <option key={cake.id} value={cake.id}>Cake {cake.id.slice(0, 6)}</option>)}</select></label>
              <div className="birthday-prompt-preview"><Sparkles size={14} /><span>Includes a happy birthday wish, a personal question, and a tiny “how well do you know me?” game.</span></div>
              <Button className="birthday-submit" type="submit" disabled={busy}><Heart size={15} /> {busy ? "Making your surprise…" : "Create their birthday link"} <ArrowRight size={15} /></Button>
            </form>
          </> : <div className="birthday-created"><div className="created-heart"><Heart fill="currentColor" /></div><span className="eyebrow">READY TO MAKE THEIR DAY</span><DialogTitle>Your little surprise is ready.</DialogTitle><p>Copy their private birthday link and send it with a little note.</p><div className="created-link"><Link2 size={15} /><span>{newBirthdayUrl}</span><Button variant="ghost" size="icon" aria-label="Copy birthday link" title="Copy link" onClick={() => { void navigator.clipboard.writeText(newBirthdayUrl); toast.success("Birthday link copied!"); }}><Copy size={16} /></Button></div><Button asChild className="birthday-share"><a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Happy birthday, ${recipientName}! I made a little surprise just for you 💛 ${newBirthdayUrl}`)}`}><MessageCircle size={16} /> Send it on WhatsApp</a></Button></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={ownerOpen} onOpenChange={setOwnerOpen}>
        <DialogContent className="owner-dialog">
          <DialogHeader><span className="eyebrow"><LockKeyhole size={13} /> THE LITTLE BAKERY BACK ROOM</span><DialogTitle>{ownerUnlocked ? "Your cake counter" : "Shop owner sign in"}</DialogTitle><DialogDescription>{ownerUnlocked ? "Upload a batch, pick the carousel favourites, and keep the cake wall lovely." : "Only the bakery team can add or edit cake photos."}</DialogDescription></DialogHeader>
          {!ownerUnlocked ? <form className="owner-login" onSubmit={signInOwner}><label className="sr-only" htmlFor="owner-password">Shop password</label><Input autoComplete="current-password" id="owner-password" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Shop password" required /><Button disabled={busy} type="submit"><LockKeyhole size={15} /> {busy ? "Checking…" : "Open the shop tools"}</Button></form> : <div className="owner-tools">
            <div className="upload-zone" role="button" tabIndex={0} onClick={() => fileInput.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInput.current?.click(); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }}>
              <CloudUpload size={28} /><strong>{busy ? "Adding cake photos…" : "Drop a batch of cake photos here"}</strong><span>Or browse your photos · JPG, PNG, WebP · up to 10 MB each</span><Button type="button" variant="outline" disabled={busy} onClick={(event) => { event.stopPropagation(); fileInput.current?.click(); }}>Choose photos</Button>
            </div>
            <input ref={fileInput} hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadFiles(event.currentTarget.files)} />
            <div className="owner-list-heading"><strong>Cake wall</strong><span>{cakes.length} saved</span></div>
            <div className="owner-cake-list">{cakes.map((cake) => <div className="owner-cake-row" key={cake.id}><img src={cake.imageUrl} alt="" /><span>Cake {cake.id.slice(0, 6)}</span><Button variant="ghost" size="icon" aria-label={cake.is_featured ? "Remove from carousel" : "Feature in carousel"} title={cake.is_featured ? "Remove from carousel" : "Feature in carousel"} onClick={() => void toggleFeatured(cake)}>{cake.is_featured ? <Star fill="currentColor" /> : <Star />}</Button><Button variant="ghost" size="icon" aria-label="Remove cake photo" title="Remove cake photo" onClick={() => void deleteCake(cake)}><Trash2 /></Button></div>)}</div>
            {birthdayLinks.length > 0 && <div className="owner-links"><strong>Birthday surprises made</strong>{birthdayLinks.slice(0, 6).map((link) => <button key={link.slug} onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/birthday/${link.slug}`); toast.success("Birthday link copied!"); }}><span>{link.recipient_name} · {relationLabels[link.relationship as Relation] ?? "Birthday"}</span><Copy size={14} /></button>)}</div>}
            <Button className="owner-signout" variant="ghost" onClick={() => void signOutOwner()}><X size={14} /> Sign out of shop tools</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </main>
  );
}