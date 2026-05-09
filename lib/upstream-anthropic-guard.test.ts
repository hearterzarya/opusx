import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAnthropicSyntheticPlatformKeyExpiry } from "./upstream-anthropic-guard";

describe("isAnthropicSyntheticPlatformKeyExpiry", () => {
  it("detects Anthropic-style synthetic expiry message", () => {
    assert.equal(
      isAnthropicSyntheticPlatformKeyExpiry({
        id: "msg_expired_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Your API key expired on 5/2/2026. Please contact your administrator to renew it.",
          },
        ],
      }),
      true,
    );
  });

  it("returns false for normal error envelope", () => {
    assert.equal(
      isAnthropicSyntheticPlatformKeyExpiry({
        type: "error",
        error: { type: "authentication_error", message: "nope" },
      }),
      false,
    );
  });
});
