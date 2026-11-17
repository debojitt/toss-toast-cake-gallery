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
});