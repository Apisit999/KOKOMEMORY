import test from "node:test";
import assert from "node:assert/strict";
import { androidChromeIntent, inAppBrowserName } from "../../src/components/studio/save-photo.ts";

test("in-app browsers that block saving are detected; normal browsers are not", () => {
  assert.equal(inAppBrowserName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Mobile/15E148 Line/13.5.0"), "LINE");
  assert.equal(inAppBrowserName("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537 Mobile [FBAN/FB4A;FBAV/400.0]"), "Facebook");
  assert.equal(inAppBrowserName("Mozilla/5.0 (iPhone) Mobile/15E148 Instagram 300.0"), "Instagram");
  assert.equal(inAppBrowserName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1"), null);
  assert.equal(inAppBrowserName("Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36"), null);
});

test("Android in-app browsers get a Chrome intent; normal browsers, iPhone and plain HTTP do not", () => {
  const fb = "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]";
  const intent = androidChromeIntent(fb, "https://kokomemory.com/s/abc?openExternalBrowser=1");
  assert.ok(intent?.startsWith("intent://kokomemory.com/s/abc?openExternalBrowser=1#Intent;scheme=https;package=com.android.chrome;"));
  assert.equal(androidChromeIntent("Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36", "https://kokomemory.com/s/abc"), null);
  assert.equal(androidChromeIntent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) [FBAN/FBIOS]", "https://kokomemory.com/s/abc"), null);
  assert.equal(androidChromeIntent(fb, "http://192.168.1.5:3040/s/abc"), null);
});
