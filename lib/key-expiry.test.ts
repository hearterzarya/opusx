import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isApiKeyExpired } from "./key-expiry";

describe("isApiKeyExpired", () => {
  it("treats null as not expired", () => {
    assert.equal(isApiKeyExpired(null, 1_000_000_000_000), false);
  });

  it("UTC midnight expiry is valid through end of that UTC day", () => {
    const may18Midnight = new Date("2026-05-18T00:00:00.000Z");
    const noonMay18 = Date.UTC(2026, 4, 18, 12, 0, 0, 0);
    assert.equal(isApiKeyExpired(may18Midnight, noonMay18), false);
    const startMay19 = Date.UTC(2026, 4, 19, 0, 0, 0, 0);
    assert.equal(isApiKeyExpired(may18Midnight, startMay19), true);
  });

  it("non-midnight uses exact instant", () => {
    const t = new Date("2026-05-18T15:30:00.000Z");
    assert.equal(isApiKeyExpired(t, Date.UTC(2026, 4, 18, 15, 29, 59, 999)), false);
    assert.equal(isApiKeyExpired(t, Date.UTC(2026, 4, 18, 15, 30, 0, 0)), true);
  });
});
