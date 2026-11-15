import { createHash, timingSafeEqual } from "node:crypto";

export function shopPasswordMatches(input: string, expected: string): boolean {
  const inputHash = createHash("sha256").update(input, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(inputHash, expectedHash);
}
