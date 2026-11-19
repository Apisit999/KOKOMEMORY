// Estimated cloud + paper cost of one event, from published list prices. Change the numbers below (or pass flags) and run again.
// Usage: node scripts/cost-estimate.mjs [--rate 35] [--months 3] [--photos 3] [--download 0.6] [--visits 1.5] [--roll-price 0] [--roll-m 30] [--slip-mm 100]
const args = Object.fromEntries(process.argv.slice(2).reduce((p, v, i, a) => (v.startsWith("--") ? [...p, [v.slice(2), a[i + 1]]] : p), []));
const num = (k, d) => Number(args[k] ?? d);
const THB_PER_USD = num("rate", 35);          // ASSUMPTION, not a published rate: update to today's rate
const MONTHS = num("months", 3);              // how long photos are kept (plans: Free 90 days, Studio 180 days)
const PHOTOS = num("photos", 3);              // photos per session
const DOWNLOAD_SHARE = num("download", 0.6);  // ASSUMPTION: share of guests who save the photos
const VISITS = num("visits", 1.5);            // ASSUMPTION: times a guest opens the link
const ROLL_PRICE = num("roll-price", 0);      // THB per roll: the owner's real price (0 = not given)
const ROLL_M = num("roll-m", 30);             // metres per roll
const SLIP_MM = num("slip-mm", 100);          // printed length ~66-86 mm measured on the virtual printer, plus the printer's feed before the cutter

// MEASURED on two real event photos (1920x1280) with the site's own settings (thumb 400px, preview 1600px, download 2560px).
const SIZE_MB = { thumb: 0.0105, preview: 0.09, download: 0.208 };
const DERIVATIVES_MB = SIZE_MB.thumb + SIZE_MB.preview + SIZE_MB.download;
// ASSUMPTIONS about how many object-storage operations one photo causes.
const CLASS_A_PER_PHOTO = 4;  // original + 3 derived copies written
const CLASS_B_PER_PHOTO = 2 + 1 + 1 + DOWNLOAD_SHARE; // read original + check, then guests read thumb, preview, download (x visits below)

// PUBLISHED LIST PRICES (USD), read from the official pages on 2026-11-19. Free monthly allowances are ignored: they are per account, not per event.
const PRICES = {
  "Cloudflare R2 (Standard)": { src: "https://developers.cloudflare.com/r2/pricing/", storageGBMonth: 0.015, classAPerMillion: 4.5, classBPerMillion: 0.36, egressGB: () => 0 },
  "Backblaze B2 (pay-as-you-go), storage $6.95/TB (main page)": { src: "https://www.backblaze.com/cloud-storage/pricing", storageGBMonth: 6.95 / 1000, classAPerMillion: 0, classBPerMillion: 0, egressGB: () => 0 },
  "Backblaze B2, storage $0.005/GB (transaction page)": { src: "https://www.backblaze.com/cloud-storage/transaction-pricing", storageGBMonth: 0.005, classAPerMillion: 0, classBPerMillion: 0, egressGB: () => 0 },
};
// Backblaze: egress is free up to 3x the average monthly stored data, then $0.01/GB. For one event the stored data dwarfs the egress, so it stays inside the free allowance.

function estimate({ sessions, originalMB }) {
  const photos = sessions * PHOTOS;
  const storedGB = (photos * (originalMB + DERIVATIVES_MB)) / 1024;
  const classA = photos * CLASS_A_PER_PHOTO;
  const classB = photos * (2 + VISITS * (1 + 1 + DOWNLOAD_SHARE));
  const egressGB = (photos * VISITS * (SIZE_MB.thumb + SIZE_MB.preview + DOWNLOAD_SHARE * SIZE_MB.download)) / 1024;
  const rows = Object.entries(PRICES).map(([name, p]) => {
    const storage = storedGB * p.storageGBMonth * MONTHS;
    const requests = (classA / 1e6) * p.classAPerMillion + (classB / 1e6) * p.classBPerMillion;
    const egress = egressGB * p.egressGB();
    return { name, storage, requests, egress, total: storage + requests + egress };
  });
  const slips = sessions; // one slip per group by default
  const paperTHB = ROLL_PRICE > 0 ? slips * ROLL_PRICE * (SLIP_MM / (ROLL_M * 1000)) : null;
  return { sessions, photos, originalMB, storedGB, egressGB, classA, classB, rows, slips, paperTHB };
}

const fmt = usd => `$${usd.toFixed(usd < 1 ? 3 : 2)} (~${Math.round(usd * THB_PER_USD)} THB)`;
console.log(`Assumptions: ${PHOTOS} photos/session, kept ${MONTHS} months, ${Math.round(DOWNLOAD_SHARE * 100)}% of guests save photos, ${VISITS} visits per guest, ${THB_PER_USD} THB per USD (assumed).`);
console.log(`Measured derivative size per photo: ${DERIVATIVES_MB.toFixed(2)} MB (thumb ${SIZE_MB.thumb} + preview ${SIZE_MB.preview} + download ${SIZE_MB.download}).`);
for (const sessions of [150, 500, 1000]) for (const originalMB of [1, 6]) {
  const e = estimate({ sessions, originalMB });
  console.log(`\n${sessions} sessions, original photo ${originalMB} MB: ${e.photos} photos, stored ${e.storedGB.toFixed(1)} GB, guest download traffic ${e.egressGB.toFixed(2)} GB, writes ${e.classA}, reads ${Math.round(e.classB)}`);
  for (const r of e.rows) console.log(`  ${r.name.padEnd(62)} storage ${fmt(r.storage).padEnd(18)} requests ${fmt(r.requests).padEnd(18)} total ${fmt(r.total)}`);
  console.log(`  paper: ${e.slips} slips x ${SLIP_MM} mm = ${(e.slips * SLIP_MM / 1000).toFixed(1)} m of paper (${(e.slips * SLIP_MM / (ROLL_M * 1000)).toFixed(2)} of a ${ROLL_M} m roll)${e.paperTHB === null ? "; roll price not given" : `, about ${e.paperTHB.toFixed(0)} THB at ${ROLL_PRICE} THB per roll`}`);
}
