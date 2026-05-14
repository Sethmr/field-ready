#!/usr/bin/env node
/**
 * One-off: merge 30 new cards + 2 new packs (`land`, `inspect`) into
 * ../cards-data.js. Run once with no args; idempotent (skips IDs that already
 * exist in the deck).
 *
 * After this lands new cards as single-variant-v0, run:
 *   node generate-variants.mjs --card <id>   # for each new id (or loop)
 *   node generate-images.mjs --skip-existing # generates images for the new ones
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = resolve(__dirname, "..", "cards-data.js");

const NEW_PACKS = {
  land:    { name: "Mountain Land",      emoji: "M" },
  inspect: { name: "Inspections & Reports", emoji: "R" },
};

const NEW_CARDS = [
  // ─── Foundations: crawlspaces + more ──────────────────────────────────
  { id: "found-007", pack: "foundations", front:
    "Encapsulated vs. vented crawlspace — which is the WNC standard and why?",
    back: "Encapsulated (sealed + dehumidifier) is increasingly the WNC standard because of high mountain humidity. Vented can work in dry sites but often leads to moisture problems. Encapsulation runs $5–15K." },

  { id: "found-008", pack: "foundations", front:
    "What's the NC requirement for a crawlspace vapor barrier?",
    back: "6-mil minimum polyethylene sheet on the soil floor, taped seams, extending 6–12 inches up the foundation walls. Code requirement; commonly violated in older homes." },

  { id: "found-009", pack: "foundations", front:
    "Crawlspace insulation — walls or floor, and why does it matter?",
    back: "Encapsulated: insulate the foundation walls (R-10+), leave the floor uninsulated. Vented: insulate between the floor joists (R-19 typical), leave the walls. Reversing them creates condensation and rot." },

  { id: "found-010", pack: "foundations", front:
    "Three telltale signs of a crawlspace moisture problem you'd flag at a walkthrough?",
    back: "Efflorescence (white salt streaks) on block walls, musty smell upstairs from the stack effect, rust on metal joist hangers, peeling paint or wood rot on joists/sills." },

  { id: "found-011", pack: "foundations", front:
    "A pre-listing inspection turns up crawlspace mold. What's the listing-agent move?",
    back: "Disclosure is mandatory once known. Most lenders require remediation before closing. Pre-listing remediation runs $1.5–8K — usually cheaper to fix before listing than negotiate against late in escrow." },

  { id: "found-012", pack: "foundations", front:
    "Pier-and-beam foundation — when do you see it in WNC and what should you check?",
    back: "Common on steep mountain lots and older cabins. Concrete piers support wood or steel beams; the crawlspace is open. Watch for pier settling, beam rot at bearing points, and inadequate lateral bracing on tall piers." },

  { id: "found-013", pack: "foundations", front:
    "Retaining wall types in WNC and how long they last?",
    back: "Timber (pressure-treated): 15–25 years, rots from the bottom. Segmental block (Allan/Versa-Lok): 30–50 years, generally well-engineered. Poured concrete: 50+ years but expensive. Anything over 4 ft typically needs an engineer-stamped design." },

  // ─── Older Home Systems: roofing depth ───────────────────────────────
  { id: "older-013", pack: "older", front:
    "Standing-seam metal roof — three install types ranked by quality?",
    back: "Best to worst: mechanical seam (factory-locked, $12–20/sqft) > snap-lock (concealed fastener, $10–14/sqft) > 5V crimp exposed-fastener ($6–10/sqft, watch for fastener back-out as it ages)." },

  { id: "older-014", pack: "older", front:
    "Why is ice-and-water shield critical on a WNC roof?",
    back: "At elevation, ice dams form at the eaves when warm attic air melts snow that refreezes at the cold edge. The self-adhering membrane prevents the resulting backup from leaking through the sheathing. NC code requires at least 24\" up-slope past the heated wall in colder zones." },

  { id: "older-015", pack: "older", front:
    "What are snow guards and where do they have to go on a WNC metal roof?",
    back: "Small metal devices that prevent snow from releasing in one large slab. Required above doorways, walkways, vehicle parking, and HVAC units below any metal roof in snow country. Not optional on a north-facing slope above a porch." },

  { id: "older-016", pack: "older", front:
    "Chimney flashing — what does a properly done install look like vs. a failure?",
    back: "Good: step flashing woven into the shingles AND counter flashing tucked into a mortar joint and capped. Bad: caulk-only seal, visible gaps, a single piece of bent metal. Caulk-only chimney flashing is the #1 source of mystery interior leaks." },

  // ─── HVAC: ductwork + efficiency ─────────────────────────────────────
  { id: "hvac-006", pack: "hvac", front:
    "Why does ductwork insulation in a WNC crawlspace matter so much?",
    back: "Uninsulated supply ducts running through a cold crawl space lose conditioned air, condense on the exterior (mold risk), and tank efficiency. Code requires R-8 on supply, R-6 on return. Older homes commonly fall short." },

  { id: "hvac-007", pack: "hvac", front:
    "Heat pump SEER and HSPF — what they mean and what's good today?",
    back: "SEER = Seasonal Energy Efficiency Ratio (cooling); HSPF = Heating Seasonal Performance Factor. As of 2023, NC minimums are SEER 14.3 / HSPF 8.8. Pre-2015 units are commonly SEER 10–13, meaningfully less efficient." },

  // ─── NC Forms additions ──────────────────────────────────────────────
  { id: "form-011", pack: "forms", front:
    "What is NC Form 2-T and when do you use it?",
    back: "The NCAR/NCBA-approved Offer to Purchase and Contract for residential resale. Used statewide for nearly all single-family resales. The most-litigated standard form in NC residential transactions — know its sections cold." },

  { id: "form-012", pack: "forms", front:
    "Buyer Agency Agreement post-August 2024 — what changed and what does it mean for listings?",
    back: "Under the NAR settlement, buyer-broker compensation can no longer be advertised in the MLS and the agreement must be signed BEFORE the first showing. Sellers will increasingly see buyer-agent compensation as a concession to negotiate at offer time." },

  { id: "form-013", pack: "forms", front:
    "NC Due Diligence period — what makes it unique among states?",
    back: "NC lets the buyer walk for any reason during DD by forfeiting only the Due Diligence Fee (not earnest money). After DD ends, walking forfeits both. Typical DD period is 21–30 days. Fully negotiable; smaller in hot markets." },

  // ─── Post-Helene: CLUE report ────────────────────────────────────────
  { id: "helene-006", pack: "helene", front:
    "How do you pull a CLUE-style loss history on a property before listing?",
    back: "The CLUE report is owned by LexisNexis and can only be requested by the homeowner (or their agent with written authorization). Cost: free, 1×/year. Pre-listing best practice: request it with the seller during the listing appointment." },

  // ─── Walkthrough Q&A expansion ───────────────────────────────────────
  { id: "ego-009", pack: "ego", front:
    "Buyer asks: 'Why is this room so much colder than the rest of the house?' Diagnostic reply?",
    back: "\"Likely causes: ducts running through unconditioned space, supply vent too far from thermostat, undersized return air pull, infiltration through an exterior wall. The inspector will trace it.\"" },

  { id: "ego-010", pack: "ego", front:
    "Buyer says: 'It smells musty in here.' Confident assessment?",
    back: "\"Most often it's crawlspace humidity rising through the stack effect. Check the dehumidifier and vapor barrier first. The real fix is encapsulation if it's chronic. Worth a mold test if it lingers.\"" },

  { id: "ego-011", pack: "ego", front:
    "Buyer asks you to characterize the schools. How do you stay safe on Fair Housing?",
    back: "Don't characterize. Hand them the Macon County Schools school-locator URL and offer to share GreatSchools or NC report-card data. Steering on schools is the classic Fair Housing trap — neutral data only." },

  { id: "ego-012", pack: "ego", front:
    "Buyer flags an uneven floor. What's your calibrated answer?",
    back: "\"Could be normal settlement on a slope lot, joist sag, sill rot, or foundation movement. A marble test will confirm there's slope; only the inspector can confirm cause. I wouldn't dismiss it without verification.\"" },

  { id: "ego-013", pack: "ego", front:
    "Buyer's husband: 'What kind of insulation is in the attic?' Quick fluent reply?",
    back: "\"Looks like blown-in cellulose at roughly R-30 from the depth. WNC's prescriptive code minimum is R-38 for attics since 2009. Inspector can verify with a measurement.\"" },

  // ─── New pack: Mountain Land ─────────────────────────────────────────
  { id: "land-001", pack: "land", front:
    "Buyer asks if the land 'perked.' Why is that the wrong vocabulary in NC?",
    back: "NC doesn't do perc tests — it uses soil morphology evaluation. \"Perked\" colloquially means \"has an Improvement Permit (IP)\" but the actual evaluation is the soil scientist examining the soil profile, not water absorption." },

  { id: "land-002", pack: "land", front:
    "When is a recorded Road Maintenance Agreement (RMA) required, and what must it contain?",
    back: "Required whenever access is via a private road or shared driveway, and required by FHA and VA. Must be recorded, signed by all affected owners, with a cost-sharing formula and decision-making rules for repairs." },

  { id: "land-003", pack: "land", front:
    "Property is encumbered by a conservation easement. What does the buyer need to know?",
    back: "Reduces buildable area and may carry public access rights. Tax benefits from the original donor may transfer or may have been used up — confirm. Common easement holders in WNC: Mainspring Conservation Trust, Highlands-Cashiers Land Trust, Land Trust for the Little Tennessee." },

  { id: "land-004", pack: "land", front:
    "Tax acreage shows 12 acres but the survey shows 10.4. Which controls and what do you do?",
    back: "The recorded survey controls legally — tax records are notoriously off in mountain counties. List as the survey acreage with the plat reference; disclose any discrepancy. Never advertise tax acreage as fact on rural NC land." },

  // ─── New pack: Inspections & Reports ─────────────────────────────────
  { id: "inspect-001", pack: "inspect", front:
    "What does a standard NC home inspection cover — and what does it NOT?",
    back: "COVERS: structural (foundation, framing), systems (electrical, plumbing, HVAC, water heater), envelope (roof, siding, doors, windows). NOT covered: code compliance, environmental hazards (radon, mold, asbestos — those are separate), invasive testing, or anything inaccessible without removing materials." },

  { id: "inspect-002", pack: "inspect", front:
    "WDIR letter — what is it, who orders it, and when is it required?",
    back: "Wood-Destroying Insect Report — covers termites, carpenter ants, powder-post beetles. Buyer typically orders; a licensed pest control company performs it. Required for VA and FHA loans. ~$75–150. Common deal-stopper if active infestation found late." },

  { id: "inspect-003", pack: "inspect", front:
    "Radon testing in NC — when does it come up and what's the action threshold?",
    back: "NC has elevated radon zones, especially in the mountains. 48-hour test in the lowest livable level is the standard ($150–250). EPA action threshold: 4 pCi/L. Mitigation system (sub-slab depressurization) typically $1.5–3K." },

  { id: "inspect-004", pack: "inspect", front:
    "What's an 11th-month inspection and why should you mention it to buyers of new construction?",
    back: "New construction usually carries a 1-year builder warranty. An inspection in month 11 catches issues while the builder is still on the hook. Standard professional advice — buyers who skip it lose the warranty window for hidden defects." },
];

async function loadCards() {
  const text = await readFile(CARDS_PATH, "utf8");
  const fakeWindow = {};
  new Function("window", text)(fakeWindow);
  return { cards: fakeWindow.SEED_CARDS, packs: fakeWindow.PACKS || {} };
}

function formatCard(card) {
  const variants = (card.variants || [{ id: "v0", front: card.front, back: card.back }])
    .map(v => `    { id: ${JSON.stringify(v.id)}, front: ${JSON.stringify(v.front)}, back: ${JSON.stringify(v.back)} }`)
    .join(",\n");
  const imageField = card.image ? `image: ${JSON.stringify(card.image)}, ` : "";
  return `  { id: ${JSON.stringify(card.id)}, pack: ${JSON.stringify(card.pack)}, ${imageField}variants: [\n${variants}\n  ] }`;
}

function formatCardsFile(cards, packs) {
  const grouped = {};
  for (const c of cards) (grouped[c.pack] ||= []).push(c);
  const order = Object.keys(packs); // preserve pack ordering from PACKS object
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
// New cards are added via scripts/seed-new-cards.mjs; subsequent variant
// and image generation passes flesh them out.

window.SEED_CARDS = [
${sections}
];

window.PACKS = ${packsJson};
`;
}

async function main() {
  const { cards, packs } = await loadCards();
  const existingIds = new Set(cards.map(c => c.id));

  // Add new packs (preserve original ordering, then append).
  const mergedPacks = { ...packs };
  for (const [key, meta] of Object.entries(NEW_PACKS)) {
    if (!mergedPacks[key]) mergedPacks[key] = meta;
  }

  // Add new cards, skipping any whose id already exists (idempotent).
  let added = 0, skipped = 0;
  for (const c of NEW_CARDS) {
    if (existingIds.has(c.id)) { skipped++; continue; }
    // Normalize to variants shape with just v0.
    cards.push({
      id: c.id,
      pack: c.pack,
      variants: [{ id: "v0", front: c.front, back: c.back }],
    });
    added++;
  }

  const output = formatCardsFile(cards, mergedPacks);
  await writeFile(CARDS_PATH, output, "utf8");
  console.error(`Added ${added} cards, skipped ${skipped} (already present).`);
  console.error(`Total deck: ${cards.length} cards across ${Object.keys(mergedPacks).length} packs.`);
  console.error(`New card IDs:`);
  for (const c of NEW_CARDS) {
    if (!existingIds.has(c.id)) console.error(`  ${c.id}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
