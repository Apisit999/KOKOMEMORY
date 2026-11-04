/** Checks the first bytes of an upload against the declared MIME type (image/jpeg, png, webp, application/pdf). */
export async function matchesDeclaredType(file: Blob): Promise<boolean> {
  const b = Buffer.from(await file.slice(0, 12).arrayBuffer());
  switch (file.type) {
    case "image/jpeg": return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png": return b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp": return b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
    case "application/pdf": return b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-";
    default: return false;
  }
}
