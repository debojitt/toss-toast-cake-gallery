export const WHATSAPP_NUMBER = "919706050166";

export const BIRTHDAY_RELATIONSHIPS = [
  "girlfriend",
  "best_friend",
  "friend",
  "sister",
  "brother",
] as const;

export type BirthdayRelationship = (typeof BIRTHDAY_RELATIONSHIPS)[number];

export function buildCakeOrderHref(input: {
  cakeReference: string;
  size: string;
  date?: string;
}): string {
  const dateText = input.date
    ? ` I’d love it for ${new Date(`${input.date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`
    : "";
  const message = `Hi Toss & Toast! I’d love a custom cake inspired by this design. Cake reference: ${input.cakeReference}. Size: ${input.size}.${dateText} Could you share the flavours and details?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}