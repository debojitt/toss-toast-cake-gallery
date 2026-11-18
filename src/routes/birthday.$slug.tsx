import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Gift, Heart, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import logoAsset from "@/assets/toss-toast-logo.jpg.asset.json";
import heroImage from "@/assets/toss-toast-cake-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBirthdayLink, saveBirthdayAnswer } from "@/lib/shop.functions";
import { BIRTHDAY_RELATIONSHIPS, WHATSAPP_NUMBER } from "@/lib/shop-domain";

const relationCopy: Record<(typeof BIRTHDAY_RELATIONSHIPS)[number], { greeting: string; question: string }> = {
  girlfriend: {
    greeting: "you make every ordinary day feel like a celebration.",
    question: "What’s one little moment with me you’d happily relive?",
  },
  best_friend: {
    greeting: "life is a little more wonderful with a best friend like you.",
    question: "Which of our adventures should we recreate next?",
  },
  friend: {
    greeting: "the world is brighter with a friend like you in it.",
    question: "What’s one thing you’d love for us to do together this year?",
  },
  sister: {
    greeting: "sisters like you make every chapter sweeter.",
    question: "What’s one family memory that still makes you laugh?",
  },
  brother: {
    greeting: "a brother like you deserves the biggest slice.",
    question: "What’s one thing you want us to do together this year?",
  },
};

type SavedAnswer = { choice: string; answer: string };
function parseSavedAnswer(raw: string | null): SavedAnswer | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "choice" in parsed && "answer" in parsed && typeof parsed.choice === "string" && typeof parsed.answer === "string") {
      return { choice: parsed.choice, answer: parsed.answer };
    }
  } catch {
    return { choice: raw, answer: "" };
  }
  return null;
}

export const Route = createFileRoute("/birthday/$slug")({
  loader: ({ params }) => getBirthdayLink({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const title = loaderData?.recipient_name
      ? `A birthday surprise for ${loaderData.recipient_name} · Toss & Toast`
      : "A little birthday surprise · Toss & Toast";
    return {
      meta: [
        { title },
        { name: "description", content: "A personal birthday wish and little surprise made with love by Toss & Toast." },
        { property: "og:title", content: title },
        { property: "og:description", content: "A little birthday surprise, made just for you." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BirthdayPage,
});

function BirthdayPage() {
  const gift = Route.useLoaderData();
  const { slug } = Route.useParams();
  const saveAnswerFn = useServerFn(saveBirthdayAnswer);
  const [origin, setOrigin] = useState("");
  const savedAnswer = parseSavedAnswer(gift?.game_answer ?? null);
  const [choice, setChoice] = useState(savedAnswer?.choice ?? "");
  const [answer, setAnswer] = useState(savedAnswer?.answer ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(Boolean(savedAnswer));

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!gift) {
    return (
      <main className="birthday-page-missing">
        <img src={logoAsset.url} alt="Toss & Toast" width={120} height={80} />
        <Heart size={28} className="birthday-response-toast" />
        <h1>This little surprise wandered off.</h1>
        <p>It may have been shared incorrectly. Ask your friend for the birthday link again.</p>
        <a href="/">Back to Toss & Toast</a>
      </main>
    );
  }

  const relationship = BIRTHDAY_RELATIONSHIPS.includes(gift.relationship as (typeof BIRTHDAY_RELATIONSHIPS)[number])
    ? gift.relationship as (typeof BIRTHDAY_RELATIONSHIPS)[number]
    : "friend";
  const copy = relationCopy[relationship];
  const gameChoices = [
    { emoji: "🍰", label: "Cake & a cozy day" },
    { emoji: "🎈", label: "A big little adventure" },
    { emoji: "🎬", label: "Snacks and a movie" },
  ];

  async function saveBirthdayGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) {
      toast.error("Pick your birthday vibe first!");
      return;
    }
    setIsSaving(true);
    try {
      await saveAnswerFn({ data: { slug, answer: JSON.stringify({ choice, answer: answer.trim() }) } });
      setHasSaved(true);
      toast.success("Your answer is saved with love.");
    } catch {
      toast.error("Your answer couldn’t be saved just yet.");
    } finally {
      setIsSaving(false);
    }
  }

  const shareMessage = `Happy birthday, ${gift.recipient_name}! 🎂 ${gift.sender_name} made you a little surprise: ${origin}/birthday/${slug}`;

  return (
    <main className="birthday-page">
      <section className="birthday-page-art" aria-label="A birthday cake surprise">
        <img src={gift.cakeUrl ?? heroImage} alt={gift.cakeUrl ? `A birthday cake chosen for ${gift.recipient_name}` : "A celebration cake for a birthday surprise"} />
        <a href="/" aria-label="Toss & Toast home"><img className="birthday-page-mark" src={logoAsset.url} alt="Toss & Toast" width={102} height={76} /></a>
        <div className="birthday-page-caption">
          <span>A LITTLE SOMETHING, FROM {gift.sender_name.toLocaleUpperCase()}</span>
          <h1>Happy birthday,<br />{gift.recipient_name}!</h1>
          <p>Today is all about you. And maybe cake.</p>
        </div>
      </section>

      <section className="birthday-page-card">
        <span className="eyebrow"><Sparkles size={13} /> MADE JUST FOR YOU</span>
        <h2>A note for {gift.recipient_name}.</h2>
        <p>Dear {gift.recipient_name}, {copy.greeting} May your year bring sweet surprises, happy little moments, and a slice of something lovely. With love, {gift.sender_name}.</p>

        <form className="birthday-page-quest" onSubmit={(event) => void saveBirthdayGame(event)}>
          <span className="eyebrow"><Gift size={13} /> A TINY BIRTHDAY GAME</span>
          <h3>Pick your birthday vibe.</h3>
          <p>No wrong answers. This is a very serious scientific cake survey.</p>
          <div className="birthday-choices" role="group" aria-label="Pick your birthday vibe">
            {gameChoices.map((item) => <button type="button" className={choice === item.label ? "is-selected" : ""} key={item.label} disabled={hasSaved} onClick={() => setChoice(item.label)}><span>{item.emoji}</span>{item.label}</button>)}
          </div>
          <label className="birthday-question">{copy.question}<Input maxLength={120} value={answer} disabled={hasSaved} onChange={(event) => setAnswer(event.target.value)} placeholder="Write a little note back…" /></label>
          {hasSaved ? <div className="birthday-page-success"><Check size={16} /><span>Your answer is saved. {gift.sender_name} will love reading it!</span></div> : <Button className="birthday-answer-button" type="submit" disabled={isSaving}><Heart size={14} /> {isSaving ? "Saving your answer…" : "Send your answer with a smile"}</Button>}
        </form>

        <a className="birthday-page-share" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Send a little birthday love back <ArrowLeft size={13} /></a>
      </section>
    </main>
  );
}