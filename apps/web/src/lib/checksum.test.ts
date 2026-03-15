import { describe, it, expect } from "vitest";
import { computeChecksum } from "./checksum";

describe("computeChecksum", () => {
  it("produces deterministic output", async () => {
    const a = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    const b = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    expect(a).toBe(b);
  });

  it("changes with different inputs", async () => {
    const a = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    const b = await computeChecksum("s1", 200, 2, 10, 1000, "secret");
    expect(a).not.toBe(b);
  });

  it("returns 64-char hex string", async () => {
    const result = await computeChecksum("s1", 100, 2, 10, 1000, "secret");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes with different secret", async () => {
    const a = await computeChecksum("s1", 100, 2, 10, 1000, "secret1");
    const b = await computeChecksum("s1", 100, 2, 10, 1000, "secret2");
    expect(a).not.toBe(b);
  });
});
