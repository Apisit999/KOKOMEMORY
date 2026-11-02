import test from "node:test";
import assert from "node:assert/strict";
import { inAppBrowserName } from "../../src/components/studio/save-photo.ts";

test("in-app browsers that block saving are detected; normal browsers are not", () => {
  assert.equal(inAppBrowserName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Mobile/15E148 Line/13.5.0"), "LINE");
  assert.equal(inAppBrowserName("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537 Mobile [FBAN/FB4A;FBAV/400.0]"), "Facebook");
  assert.equal(inAppBrowserName("Mozilla/5.0 (iPhone) Mobile/15E148 Instagram 300.0"), "Instagram");
  assert.equal(inAppBrowserName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1"), null);
  assert.equal(inAppBrowserName("Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36"), null);
});
