/**
 * Saving photos on every phone. Plain download links put iPhone photos in Files, not Photos, and in-app browsers
 * (LINE, Facebook, Instagram) block them. So: share sheet with real files first ("Save Image" -> Photos on iOS,
 * Gallery on Android), then a normal download, and the long-press tip as the last resort.
 */
/** "manual": this phone cannot save from here in one tap (no share sheet; several downloads get blocked), so the page explains press-and-hold. */
export type SaveResult = "shared" | "downloaded" | "cancelled" | "failed" | "manual";
/** `load` fetches the file through our own site (preferred: same origin, no storage CORS); `url` is the direct link used when it is missing or fails. */
export type SaveItem = { url: string; downloadUrl: string; name: string; load?: () => Promise<Blob> };

/** Name of an in-app browser that usually cannot save files, or null for a normal browser. */
export function inAppBrowserName(userAgent: string): string | null {
  if (/\bLine\//i.test(userAgent)) return "LINE";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "Facebook";
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/MicroMessenger/i.test(userAgent)) return "WeChat";
  if (/musical_ly|BytedanceWebview|TikTok/i.test(userAgent)) return "TikTok";
  return null;
}

/**
 * Android only: an intent link that reopens this page in Chrome from Facebook / Instagram / other in-app browsers.
 * LINE is handled by openExternalBrowser=1 in the QR link itself; iPhone has no equivalent, so it gets the ⋯ tip.
 */
export function androidChromeIntent(userAgent: string, href: string): string | null {
  if (!/Android/i.test(userAgent) || !inAppBrowserName(userAgent)) return null;
  const url = new URL(href);
  if (url.protocol !== "https:") return null;
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

async function toFile(item: SaveItem): Promise<File> {
  let blob: Blob | null = null;
  if (item.load) { try { blob = await item.load(); } catch { blob = null; } }
  if (!blob) {
    const response = await fetch(item.url, { cache: "force-cache" });
    if (!response.ok) throw new Error("fetch failed");
    blob = await response.blob();
  }
  return new File([blob], item.name, { type: blob.type || "image/jpeg" });
}

/** Same-page blob download: works on Android Chrome even where a cross-site download link is refused, and on desktop. */
async function downloadViaBlob(item: SaveItem) {
  const file = await toFile(item);
  const objectUrl = URL.createObjectURL(file);
  try {
    const link = document.createElement("a");
    link.href = objectUrl; link.download = item.name; link.rel = "noopener";
    document.body.appendChild(link); link.click(); link.remove();
    await new Promise(resolve => setTimeout(resolve, 1500));
  } finally { URL.revokeObjectURL(objectUrl); }
}

function downloadViaLink(item: SaveItem) {
  const link = document.createElement("a");
  link.href = item.downloadUrl; link.download = item.name; link.rel = "noopener";
  document.body.appendChild(link); link.click(); link.remove();
}

export const isIOS = () => typeof navigator !== "undefined" && (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)));
export const isPhone = () => typeof navigator !== "undefined" && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)));
export const canUseShareSheet = () => typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function";

export async function savePhotos(items: SaveItem[]): Promise<SaveResult> {
  if (items.length === 0) return "failed";
  // Phones without the share sheet (plain-HTTP pages, old browsers) block repeated downloads: do not fire eight at once.
  if (items.length > 1 && isIOS() && !canUseShareSheet()) return "manual";
  try {
    if (typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function") {
      // One at a time: phones with little memory stall when every photo downloads at once.
      const files: File[] = [];
      for (const item of items) files.push(await toFile(item));
      if (navigator.canShare({ files })) {
        await navigator.share({ files });
        return "shared";
      }
    }
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") return "cancelled";
    // Fetch blocked (storage CORS), share unsupported or refused: fall through to a normal download.
  }
  try {
    for (let i = 0; i < items.length; i++) {
      // A plain same-site link with a download header is the most universal way; the blob route is the fallback.
      try { downloadViaLink(items[i]); await new Promise(resolve => setTimeout(resolve, 800)); } catch { await downloadViaBlob(items[i]); }
      if (i < items.length - 1) await new Promise(resolve => setTimeout(resolve, 600));
    }
    return "downloaded";
  } catch { return "failed"; }
}
