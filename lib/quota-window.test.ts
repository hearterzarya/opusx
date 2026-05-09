import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quotaWindowEndsAtMs, rollQuotaWindow, ROLLING_QUOTA_WINDOW_MS } from "./quota-window";

describe("rollQuotaWindow", () => {
  it("does not roll while now is inside the window", () => {
    const start = 1_000_000;
    const now = start + ROLLING_QUOTA_WINDOW_MS - 1;
    const r = rollQuotaWindow(start, BigInt(100), 0, now);
    assert.equal(r.quotaWindowStartedAtMs, start);
    assert.equal(r.quotaWindowConsumed, BigInt(100));
    assert.equal(r.quotaWindowEpoch, 0);
    assert.equal(r.windowRolled, false);
  });

  it("rolls exactly one period when now hits the boundary", () => {
    const start = 1_000_000;
    const now = start + ROLLING_QUOTA_WINDOW_MS;
    const r = rollQuotaWindow(start, BigInt(100), 3, now);
    assert.equal(r.quotaWindowStartedAtMs, start + ROLLING_QUOTA_WINDOW_MS);
    assert.equal(r.quotaWindowConsumed, BigInt(0));
    assert.equal(r.quotaWindowEpoch, 4);
    assert.equal(r.windowRolled, true);
  });

  it("rolls across multiple idle windows", () => {
    const start = 0;
    const now = ROLLING_QUOTA_WINDOW_MS * 3 + 100;
    const r = rollQuotaWindow(start, BigInt(50), 0, now);
    assert.equal(r.quotaWindowStartedAtMs, ROLLING_QUOTA_WINDOW_MS * 3);
    assert.equal(r.quotaWindowConsumed, BigInt(0));
    assert.equal(r.quotaWindowEpoch, 3);
  });
});

describe("quotaWindowEndsAtMs", () => {
  it("adds five hours in milliseconds", () => {
    assert.equal(quotaWindowEndsAtMs(0), ROLLING_QUOTA_WINDOW_MS);
  });
});
