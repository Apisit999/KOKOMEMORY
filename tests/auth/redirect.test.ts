import test from "node:test";
import assert from "node:assert/strict";
import { getAuthRedirectTarget } from "../../src/lib/auth-redirect.ts";

test("uses the account page when redirect is missing or empty", () => {
  assert.equal(getAuthRedirectTarget(""), "/account");
  assert.equal(getAuthRedirectTarget("?redirect="), "/account");
});

test("preserves an internal redirect including its query and fragment", () => {
  const target = "/account/koko-studio/link?code=ABC#section";
  assert.equal(getAuthRedirectTarget(`?redirect=${encodeURIComponent(target)}`), target);
});

test("rejects external, protocol-relative, and backslash redirects", () => {
  for (const value of [
    "https://example.com/account",
    "//example.com/account",
    "/\\example.com/account",
    "/account\\@example.com",
  ]) {
    assert.equal(getAuthRedirectTarget(`?redirect=${encodeURIComponent(value)}`), "/account", value);
  }
});
