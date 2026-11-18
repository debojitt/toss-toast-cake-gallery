import { describe, expect, it } from "vitest";

import { BIRTHDAY_RELATIONSHIPS, buildCakeOrderHref, WHATSAPP_NUMBER } from "@/lib/shop-domain";

describe("Toss & Toast shop details", () => {
  it("uses the WhatsApp contact supplied by the shop owner", () => {
    expect(WHATSAPP_NUMBER).toBe("919706050166");
    expect(buildCakeOrderHref({ cakeReference: "abc12345", size: "8 inch" })).toContain("https://wa.me/919706050166?");
  });

  it("offers a birthday surprise for each requested relationship", () => {
    expect(BIRTHDAY_RELATIONSHIPS).toEqual(["girlfriend", "best_friend", "friend", "sister", "brother"]);
  });

  it("includes the selected cake, size, and requested date in the order message", () => {
    const href = buildCakeOrderHref({ cakeReference: "abc12345", size: "8 inch", date: "2026-11-20" });
    const message = new URL(href).searchParams.get("text");
    expect(message).toContain("Cake reference: abc12345");
    expect(message).toContain("Size: 8 inch");
    expect(message).toContain("20 November");
  });
});