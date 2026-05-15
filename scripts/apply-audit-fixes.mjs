#!/usr/bin/env node
/**
 * One-off: apply the 26 v0 corrections from the audit pass to cards-data.js.
 * After this lands, run generate-variants.mjs --card <id> for each fixed card
 * to regenerate v1-v10 (so the corrections propagate through all variants).
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = resolve(__dirname, "..", "cards-data.js");

// All 26 fixes from the 4-agent audit pass. Field shape:
//   { id, new_back, new_front? }   — front only included when reframing changed it
const FIXES = [
  // ─── INCORRECT (7) ─────────────────────────────────────────────────────
  { id: "septic-018",
    new_back: "Tank: 5 ft from property line, 50 ft from a private well. Drainfield: 10 ft from property line, 100 ft from a private well, 50 ft from any stream or water body (greater on classified waters). Critical for any new build, addition, or pool. Reduce these and the permit is denied." },

  { id: "well-009",
    new_back: "NC requires well casing to extend at least 20 feet below land surface (15A NCAC 02C .0107). For wells in bedrock, the casing must also seat into competent rock and be properly grouted. Most WNC drilled wells far exceed this. Casing shorter than the rule risks surface water contaminating the aquifer." },

  { id: "land-003",
    new_back: "Reduces buildable area; may (rarely) carry public access if specifically granted in the easement deed. Tax benefits from the original donor may transfer or may have been used up — confirm. Common WNC easement holders: Mainspring Conservation Trust (formerly Land Trust for the Little Tennessee, rebranded 2014), Highlands-Cashiers Land Trust, Blue Ridge Conservancy, Southern Appalachian Highlands Conservancy." },

  { id: "closing-015",
    new_back: "A rent-back / Seller Possession After Closing Agreement (NCAR Standard Form 2A8-T) or a contract addendum. Seller stays for N days post-closing, pays daily rent (often $0–100/day, sometimes a security deposit). Cap at 60 days — beyond that, lender may treat the property as non-owner-occupied and there's insurance complication." },

  { id: "inspect-015",
    new_back: "Pre-listing inspection: retain through closing + at least 6 years (NC has a 3-year SOL on fraud and contract claims from discovery, plus a 6-year statute of repose on improvements to real property — keep through the longer window). Buyer's inspection: their record. Both belong in the seller's house file with permits, warranties, and pump records." },

  { id: "hvac-011",
    new_back: "R-22 (Freon): pre-2010, ozone-depleting, banned in new equipment 2010, production/import banned 2020. R-410A (Puron): 2010–2024 standard. R-454B (Opteon XL41) and R-32: 2025+ phased in. Old R-22 systems are increasingly expensive to recharge ($200–500 per pound; system holds 4–8 lbs). Flag R-22 = replace soon." },

  { id: "hoa-012",
    new_back: "Under federal HOPA: at least 80% of occupied units must have at least one resident age 55+. Community must publish and enforce its age policies. Most communities further restrict minimum ages for occupants in the remaining 20% (often 18+ or 19+, set by community bylaws). Limits the buyer pool; disclose age-restriction status in listing remarks." },

  // ─── MINOR_ISSUE (19) ──────────────────────────────────────────────────
  { id: "septic-016",
    new_back: "Under 15A NCAC 18E (2024), residential design flow starts at 240 gpd for a 2-bedroom home and adds roughly 60–120 gpd per additional bedroom (the older 120 gpd-per-bedroom figure was a flat rate under the prior 18A rule). Larger or higher-use buildings (B&Bs, group homes) require an engineered design. This is why bedroom count is permit-tied — it dictates capacity." },

  { id: "well-011",
    new_back: "NC Division of Water Resources keeps drilling records (GW-1 well construction records); the county environmental health office often has copies too. Wells drilled after the late 2000s — when statewide electronic submission tightened — usually have a log on file. Older wells frequently have nothing — always disclose if a log is unavailable." },

  { id: "well-016",
    new_back: "Steel (typically black or schedule-40, not galvanized): the long-time standard, rusts internally, 30–50 year life, often the source of rusty water in older wells. PVC: increasingly common on shallower or alternative systems, doesn't rust, 75+ year life, cheaper to install. WNC mountain wells in bedrock still commonly use steel for the upper section through soil with the bedrock interval left as open hole." },

  { id: "found-008",
    new_back: "6-mil minimum polyethylene on the soil floor with joints lapped at least 6 inches (taped or sealed in encapsulated crawlspaces), extending up the foundation wall and mechanically attached — to the top of the wall in a sealed/encapsulated crawl, at least 6 inches up in a vented crawl. Code requirement; commonly violated in older homes." },

  { id: "found-014",
    new_back: "NC code sets a 12-inch statewide minimum, but most WNC mountain counties enforce 18 inches as the working minimum, and 24 inches at higher elevations per local amendment. Footings must be below the frost line — otherwise frost heave will lift and crack the foundation. Older WNC structures with shallow footings are a common settlement source." },

  { id: "older-013",
    new_back: "Best to worst: mechanical-seam standing-seam (factory-locked, $12–20/sqft) > snap-lock standing-seam (concealed fastener, $10–14/sqft) > 5V crimp (exposed-fastener through-panel, technically not standing-seam, $6–10/sqft, watch for fastener back-out as it ages)." },

  { id: "older-014",
    new_back: "At elevation, ice dams form at the eaves when warm attic air melts snow that refreezes at the cold edge. The self-adhering membrane prevents the resulting backup from leaking through the sheathing. NC code requires the membrane to extend at least 24\" up-slope past the interior face of the exterior wall in colder zones." },

  { id: "hvac-007",
    new_back: "SEER = Seasonal Energy Efficiency Ratio (cooling); HSPF = Heating Seasonal Performance Factor. As of Jan 2023 the federal test standard switched to SEER2/HSPF2 — the heat pump minimum is SEER2 14.3 / HSPF2 7.5 (equivalent to old SEER 15 / HSPF 8.8). Pre-2015 units are commonly SEER 10–13, meaningfully less efficient." },

  { id: "ego-003",
    new_back: "\"I'll request the most recent flow test from the seller. FHA wants 5 GPM sustained; I aim for 5+ for resale.\"" },

  { id: "ego-020",
    new_back: "Where's the septic and its setback? Pool plus equipment needs to clear: drainfield (typically 25 ft per NC 15A NCAC 18E), reserve/repair area (25 ft), and well (typically 100 ft from drainfield). On a typical 1/2-acre lot, septic constraints often kill the pool plan. Always pull the IP (Improvement Permit) and site plan from county environmental health before promising 'plenty of room.'" },

  { id: "form-001",
    new_back: "NC Residential Property and Owners' Association Disclosure Statement (Form REC 4.22). Per NCGS 47E-5, must be delivered no later than when the buyer makes the offer. If late, buyer has a 3-day right to cancel without penalty." },

  { id: "form-014",
    new_back: "Federal Title X requires delivery of the lead-based paint disclosure pamphlet and disclosure form to the buyer BEFORE the contract is binding (offer to purchase). Pre-1978 homes only. Seller and listing agent both sign. Buyer also gets a 10-day opportunity to conduct a lead-based paint risk assessment/inspection (waivable or modifiable in writing) before becoming obligated under the contract." },

  { id: "land-006",
    new_back: "Most of unincorporated Macon County is unzoned — setbacks come from the NC State Building Code, septic/well separations, and subdivision covenants, not a county zoning ordinance. Town of Franklin and Town of Highlands have their own zoning inside city limits. Always verify covenants AND any town zoning before promising buildability." },

  { id: "land-014",
    new_back: "Call the relevant utility for the parcel — in Macon County that's typically Duke Energy or Tri-State EMC; Jackson County is Duke Energy or Haywood EMC. Request a service availability quote: anywhere from no charge (existing pole at the lot line) to $5–15K (long line extension over private land). Disclose status BEFORE contract to avoid surprises." },

  { id: "closing-003",
    new_back: "Owner's policy on a $400K NC sale typically runs ~$700–$1,200 (NC rates are filed; figure roughly $1.50–$2.00 per $1,000). Simultaneous-issue lender's policy adds a small additional premium. Buyer customarily pays both. Seller pays for title clearing if defects surface." },

  { id: "str-001",
    new_back: "Macon County is friendlier to STRs than Buncombe. No countywide ban, no countywide permit fee. However, the town of Franklin has zoning-based restrictions in some residential areas, and HOA-governed communities in the broader Highlands-Cashiers corridor (Highlands CC in Macon; Mountaintop and Wade Hampton in Jackson) often prohibit STRs entirely. Verify per parcel." },

  { id: "str-002",
    new_back: "NC combined sales tax 6.75% (state 4.75% + Macon County 2%) + Macon County occupancy tax 4% = roughly 10.75% on bookings. Owner-collected; remitted to NC DOR + Macon County. Property managers usually handle this; self-managed owners must register." },

  { id: "wnc-004",
    new_back: "NC mountain code typically calls for 30–50+ psf ground snow load depending on elevation, with site-specific engineering required at the highest elevations. Above 4,000 ft, look for engineered roof structures or steeper pitches. Older flat-roofed cabins at altitude are a real winter risk." },

  { id: "hoa-001",
    new_back: "Major gated communities in the WNC Highlands-Cashiers-Brevard corridor Brandi should know cold: Highlands CC (Macon), Old Edwards Club (Macon), Mountaintop Golf & Lake Club (Jackson), Wade Hampton Golf Club (Jackson, Cashiers), Cullasaja Club (Macon), Bear Lake Reserve (Jackson), Trillium (Jackson), Lake Toxaway CC (Transylvania), Connestee Falls (Transylvania, Brevard). Each has distinct HOA rules, fees, and STR/rental restrictions." },
];

async function loadCards() {
  const text = await readFile(CARDS_PATH, "utf8");
  const fakeWindow = {};
  new Function("window", text)(fakeWindow);
  return { cards: fakeWindow.SEED_CARDS, packs: fakeWindow.PACKS };
}

function formatCard(card) {
  const variants = card.variants
    .map(v => `    { id: ${JSON.stringify(v.id)}, front: ${JSON.stringify(v.front)}, back: ${JSON.stringify(v.back)} }`)
    .join(",\n");
  const imageField = card.image ? `image: ${JSON.stringify(card.image)}, ` : "";
  return `  { id: ${JSON.stringify(card.id)}, pack: ${JSON.stringify(card.pack)}, ${imageField}variants: [\n${variants}\n  ] }`;
}

function formatCardsFile(cards, packs) {
  const grouped = {};
  for (const c of cards) (grouped[c.pack] ||= []).push(c);
  const order = Object.keys(packs);
  const sections = order.filter(p => grouped[p]).map(pack => {
    const list = grouped[pack];
    const meta = packs[pack];
    const header = `  // ─── ${meta?.name || pack} (${list.length}) ─────────────────────────────────────`;
    return `${header}\n${list.map(formatCard).join(",\n")}`;
  }).join(",\n\n");

  const packsJson = JSON.stringify(packs, null, 2)
    .split("\n").map((line, i) => i === 0 ? line : "  " + line).join("\n");

  return `// FieldReady seed deck
//
// Card text extracted from the WNC listing-agent research dossier (May 2026).
// Variants and images generated by scripts/generate-{variants,images}.mjs.
// New cards added via scripts/seed-new-cards.mjs.
// Audit corrections applied via scripts/apply-audit-fixes.mjs (May 14, 2026).

window.SEED_CARDS = [
${sections}
];

window.PACKS = ${packsJson};
`;
}

async function main() {
  const { cards, packs } = await loadCards();
  const byId = new Map(cards.map(c => [c.id, c]));

  let applied = 0, missing = 0;
  for (const fix of FIXES) {
    const card = byId.get(fix.id);
    if (!card) { console.error(`MISSING: ${fix.id}`); missing++; continue; }
    const v0 = card.variants.find(v => v.id === "v0");
    if (!v0) { console.error(`NO v0: ${fix.id}`); missing++; continue; }
    if (fix.new_front) v0.front = fix.new_front;
    if (fix.new_back) v0.back = fix.new_back;
    applied++;
  }

  const output = formatCardsFile(cards, packs);
  await writeFile(CARDS_PATH, output, "utf8");
  console.error(`Applied ${applied} fixes (${missing} missing).`);
  console.error(`Wrote ${CARDS_PATH}`);
  console.error(`Next: regenerate variants for these IDs so v1–v10 reflect the fix.`);
}

main().catch(err => { console.error(err); process.exit(1); });
