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
  land:    { name: "Mountain Land",         emoji: "M" },
  inspect: { name: "Inspections & Reports", emoji: "R" },
  wnc:     { name: "WNC Climate & Geography", emoji: "G" },
  str:     { name: "STR Investor",          emoji: "S" },
  closing: { name: "Closing Process",       emoji: "C" },
  hoa:     { name: "HOA Knowledge",         emoji: "H" },
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

  // ─── BATCH 2 ─────────────────────────────────────────────────────────
  // WNC microclimate, STR, closing process, seller psychology, more
  // wells/HVAC/older-electrical depth.

  // ─── New pack: WNC Climate & Geography ──────────────────────────────
  { id: "wnc-001", pack: "wnc", front:
    "What's the elevation premium pattern in WNC and where's the sweet spot for resale?",
    back: "Higher elevation = generally more desirable for the cooler summer and view potential. Sweet spot for resale: 2,800–4,000 ft. Above 4,500 ft adds winter access concerns (snow, road closures, ice). FL/GA second-home buyers will pay a real premium for the temperature differential at altitude." },

  { id: "wnc-002", pack: "wnc", front:
    "Why is 'as the crow flies' distance misleading on WNC listings?",
    back: "Mountain roads add 2–3× linear distance via switchbacks and ridges. A property '10 miles' from town can be a 35-minute drive. Always quote drive time, not linear distance, to a buyer who hasn't lived in the mountains." },

  { id: "wnc-003", pack: "wnc", front:
    "What's the difference between a 'cove' home and a 'ridge' home in WNC, and what tradeoff do buyers need to understand?",
    back: "Cove (valley bottom between ridges): sheltered, warmer winters, more fog, limited view. Ridge: long-range view, more wind exposure, colder, more sun. Same county, totally different living experience — set buyer expectations early." },

  { id: "wnc-004", pack: "wnc", front:
    "Snow load expectations in mountain Macon County — what should you flag?",
    back: "NC mountain code typically calls for 30–40 psf ground snow load depending on elevation. Above 4,000 ft, look for engineered roof structures or steeper pitches. Older flat-roofed cabins at altitude are a real winter risk." },

  { id: "wnc-005", pack: "wnc", front:
    "WNC listing seasonality — when do you list to ride the curve?",
    back: "April through October is the active showing season. Foliage peaks in mid-to-late October and pulls a wave of leaf-peeper buyers; summer escape demand June–August. December–February is slow. List in March for spring momentum, not August." },

  { id: "wnc-006", pack: "wnc", front:
    "A Florida buyer is moving to a 3,500-ft mountain property. What climate prep do they need?",
    back: "Summer highs roughly 15°F cooler than coastal FL. Winters drop below freezing regularly — they'll need to learn heat pump efficiency, propane backup, ice on roads, salting steps, vehicle tires. The 'mountains are like FL but cooler' framing is a mistake; set realistic winter expectations early." },

  // ─── New pack: STR Investor ──────────────────────────────────────────
  { id: "str-001", pack: "str", front:
    "Macon County STR (short-term rental) rules — current status?",
    back: "Macon County is friendlier to STRs than Buncombe or Highlands. No countywide ban, no countywide permit fee. However, the town of Franklin has zoning-based restrictions in some residential areas, and HOA-governed communities (Mountaintop, Wade Hampton, Highlands CC) often prohibit STRs entirely. Verify per parcel." },

  { id: "str-002", pack: "str", front:
    "Total occupancy + sales tax on a NC short-term rental?",
    back: "NC state sales tax 6.75% + Macon County occupancy tax 4% = roughly 10.75% on bookings. Owner-collected; remitted to NC DOR + Macon County. Property managers usually handle this; self-managed owners must register." },

  { id: "str-003", pack: "str", front:
    "Typical STR revenue pattern for a 3BR mountain home in WNC?",
    back: "Peak May–October drives 60–70% of annual revenue. Strong: foliage October, summer July–August. Low: January–February. Conservative annual gross: $30–50K for a typical 3BR. View/luxury cabins in the right pocket can hit $80–120K. Discount realistic numbers when proforma'ing for investor buyers." },

  { id: "str-004", pack: "str", front:
    "Property management cost on a WNC STR — what does an investor budget?",
    back: "Full-service management (cleaning, listings, guest comms, maintenance dispatch) is 20–30% of gross. Limited management (just listings/comms) is 10–15%. Self-managed: real labor, no fee. Investor proformas commonly forget this — call it out at the consult." },

  { id: "str-005", pack: "str", front:
    "DSCR loan — what is it and why does an STR investor care?",
    back: "Debt-Service Coverage Ratio loan. Underwrites the property's rental income, not the borrower's W-2. Typical requirement: 1.0–1.25 DSCR (revenue covers debt service). Rates higher than conventional but the qualification is property-based, which is how investors with multiple properties scale." },

  // ─── New pack: Closing Process ───────────────────────────────────────
  { id: "closing-001", pack: "closing", front:
    "NC is an attorney-closing state — who does the attorney actually represent?",
    back: "Typically the buyer (or the lender). NOT the seller. Only an NC-licensed attorney can conduct a residential closing. The buyer normally picks the attorney; the listing agent should be prepared with a seller-preferred attorney to recommend, or to accept the buyer's choice if cordial." },

  { id: "closing-002", pack: "closing", front:
    "Wire fraud red flags — what does Brandi coach a seller on at the listing appointment?",
    back: "NEVER trust wire instructions that arrive by email at the last minute. ALWAYS call the closing attorney's office directly using a number you got at the listing appointment, NOT a number in any email. NEVER click links in closing emails. Wire fraud is the #1 NC real estate fraud category — get the warning in early." },

  { id: "closing-003", pack: "closing", front:
    "Title insurance in NC — who pays what?",
    back: "Owner's policy protects the BUYER's title interest; typically buyer pays (~$300–700 on a $400K sale). Lender's policy protects the lender; buyer pays. Seller pays for title clearing if defects surface. The split is negotiable but the conventional NC split is: buyer pays both policies." },

  { id: "closing-004", pack: "closing", front:
    "Final walk-through — when does it happen and what's being checked?",
    back: "Usually 24–48 hours before closing. Buyer (with their agent) verifies: agreed-on repairs completed, property in the same condition, included fixtures and items present, utilities functional. New issues here can delay or kill a closing — listing agent should confirm seller has the house ready." },

  { id: "closing-005", pack: "closing", front:
    "On closing day in NC, when does the seller actually get the money?",
    back: "Funds disburse from the attorney's trust account AFTER the deed records at the county registry of deeds. Typically same-day, often within hours of recording. Sellers should expect to wait until afternoon for the wire confirmation; don't make immediate plans dependent on those funds." },

  // ─── CMA expansion: seller psychology ────────────────────────────────
  { id: "cma-009", pack: "cma", front:
    "Seller says: 'I want to test the market at $X.' How do you reply confidently?",
    back: "\"I hear you — but the market tests the listing too. Overpriced listings stale fast, get fewer showings, and need price drops that signal weakness. Your first 14 days are when you have the most leverage. Let's price for momentum, not posture, and reassess if the data tells us to.\"" },

  { id: "cma-010", pack: "cma", front:
    "How do you re-engage a stale-listing seller after 60+ days without offers?",
    back: "Don't blame the prior agent. Lead with what changed in the market since they listed (rates, inventory, season). Then pivot: \"Let's reset with fresh photos, a price aligned with what's sold in the last 60 days, and a new narrative for the listing remarks.\" Forward-looking, not retrospective." },

  { id: "cma-011", pack: "cma", front:
    "When do you recommend a price drop, and what does the timing tell you?",
    back: "WNC average DOM is 60–90 days. By day 30 with no showings: usually photos OR pricing. Day 60 with showings but no offers: pricing. Day 90+: pricing AND probably presentation. The cleaner the data signal, the easier the conversation." },

  { id: "cma-012", pack: "cma", front:
    "Seller objection: 'I have a number in my head.' How do you handle it?",
    back: "Listen to the number, don't dismiss it. Then: \"Let's look at what the market said in the last 90 days.\" Walk through pendings and solds. The conversation isn't about disagreeing — it's about anchoring them to data they have to confront on their own." },

  { id: "cma-013", pack: "cma", front:
    "First-week showing analysis — what cadence tells you what?",
    back: "Strong: 5+ showings with at least one second look. Average: 2–3 showings. Weak: 0–1. Use the first week as your earliest pricing signal — if it's weak, recommend a quick adjustment BEFORE the listing goes stale, while you still have buyer-attention momentum." },

  // ─── Wells expansion ─────────────────────────────────────────────────
  { id: "well-009", pack: "wells", front:
    "What's the NC well casing depth requirement, and why does it matter?",
    back: "Minimum casing depth is 20 feet below static water level, OR down to competent bedrock — whichever is greater. Most WNC drilled wells far exceed this. Casing shorter than the rule risks surface water contamination of the aquifer." },

  { id: "well-010", pack: "wells", front:
    "Four water treatment systems you'll see on WNC wells and what they do?",
    back: "Water softener (ion exchange, removes calcium/magnesium for hard water). UV sterilizer (kills bacteria, no chemicals). Reverse osmosis (under-sink, drinking water). Whole-house carbon filter (chlorine, taste). Most WNC wells need at least UV or a sediment filter." },

  { id: "well-011", pack: "wells", front:
    "How do you retrieve a well log for a NC property?",
    back: "NC Division of Water Resources keeps drilling records via the Drinking Water Hub; the county environmental health office often has copies too. Wells drilled after 1988 typically have a log on file. Pre-1988 wells frequently have nothing — always disclose if a log is unavailable." },

  // ─── HVAC: water heaters ─────────────────────────────────────────────
  { id: "hvac-008", pack: "hvac", front:
    "How do you read the age of a water heater?",
    back: "The serial number sticker on the side of the tank encodes the manufacture date — first 4 digits usually month + year, but the format varies by brand (Rheem, AO Smith, State, Bradford White all differ). Residential tanks: 10–12 year lifespan. Old + signs of corrosion = flag for replacement." },

  { id: "hvac-009", pack: "hvac", front:
    "Tankless vs. tank water heater — pros and cons?",
    back: "Tankless: endless hot water, 20-year lifespan, lower operating cost, but $2–4K upfront and venting requirements. Tank: cheaper install, 10–12 year life, recovery time limits simultaneous use. WNC: tankless propane increasingly common in new builds; tank electric or gas in older homes." },

  { id: "hvac-010", pack: "hvac", front:
    "Water heater venting — atmospheric vs. power vent, and why does it matter?",
    back: "Atmospheric (gravity through a chimney) is older and requires good draft — it can backdraft carbon monoxide if the exhaust path is compromised. Power vent uses an electric blower, safer and works with horizontal runs. Always look for a working CO detector nearby on any gas water heater." },

  // ─── Older home systems: service amperage + lead service + sub-panels ─
  { id: "older-017", pack: "older", front:
    "Service entrance amperage — 60A / 100A / 200A and what each means for a buyer?",
    back: "60A: pre-1960, inadequate for modern loads (no EV charging, marginal HVAC). 100A: 1960s–90s standard, marginal for HVAC + EV. 200A: modern standard, recommended. Upgrade from 60A to 200A typically runs $2–4K, and insurance often discounts after." },

  { id: "older-018", pack: "older", front:
    "Lead service line (water main) — what years and how do you check?",
    back: "Pre-1986 plumbing may have a lead service line entering the home. EPA's 2024 rule mandates inventory by water systems. Field test: scratch the pipe — lead is soft and gray; galvanized is silver and hard; copper is orange. Replacement runs $3–8K. Always flag pre-1986 homes." },

  { id: "older-019", pack: "older", front:
    "Sub-panel — what is it and what should you check for?",
    back: "A secondary breaker panel, usually in a remote part of the house (garage, addition, second floor). Service entrance feeds the main; main feeds sub-panels. Important: sub-panels in DETACHED structures need their own ground rod. Improper bonding is a common code violation in older WNC additions." },

  // ─── BATCH 3: DEEPENING the four shallowest packs ────────────────────
  // Land, Inspections, Closing, STR — every pack now ≥12 cards. Quality
  // over breadth.

  // ─── Mountain Land deepening (+11 to reach 15) ───────────────────────
  { id: "land-005", pack: "land", front:
    "NCDOT driveway permit — when is it required and what's the trap?",
    back: "Required any time a new driveway connects to a state-maintained road (most rural NC). $50 fee, but the trap is buyers assume an existing driveway 'just works.' Verify the permit exists in NCDOT's records before listing raw land — adding one later can be denied if sight distance is wrong." },

  { id: "land-006", pack: "land", front:
    "Typical setback requirements on a Macon County rural lot?",
    back: "Macon rural zoning: front 25 ft, side 15 ft, rear 25 ft, typical. Many subdivisions impose tighter setbacks via covenants. Always check the parcel's zoning AND the subdivision restrictions before promising buildability." },

  { id: "land-007", pack: "land", front:
    "Plat vs. survey — what's the difference and which controls?",
    back: "Plat = recorded subdivision drawing showing all the lots (public record). Survey = current measurement of one specific parcel by a licensed surveyor (commissioned). Both are authoritative; a current survey controls over an older plat when they disagree." },

  { id: "land-008", pack: "land", front:
    "What's the 'septic envelope' on a vacant lot and why does it matter?",
    back: "The area the soil scientist identified as suitable for a septic system on the lot — it can be a small portion of a 5-acre parcel if topography is restrictive. Always show buyers the envelope on the IP map; the 'house can go anywhere' assumption gets broken here." },

  { id: "land-009", pack: "land", front:
    "Four easement types you'll commonly see on rural NC land?",
    back: "Access (right to cross another parcel), utility (power/water line right-of-way), view (rare; only enforceable if recorded as a covenant), conservation (limits development, often tax-incentivized). Always pull the deed for 'subject to' language." },

  { id: "land-010", pack: "land", front:
    "Mineral rights in NC — disclosure mechanics?",
    back: "NC requires the Mineral and Oil and Gas Rights Mandatory Disclosure Statement on every residential sale. Seller marks whether the rights have been severed from the surface. Verify by reviewing the deed's chain and any prior mineral conveyances; missing this is a frequent NCREC complaint." },

  { id: "land-011", pack: "land", front:
    "Does Macon County have a steep-slope ordinance?",
    back: "No countywide steep-slope ordinance. The town of Highlands has one within town limits. Buyers from Buncombe County (which has the toughest steep-slope rule in WNC) often assume Macon does too — set them straight early to avoid pricing-in a regulation that isn't there." },

  { id: "land-012", pack: "land", front:
    "Commissioning a soil scientist for a vacant lot — what does it cost and when do you do it?",
    back: "A licensed soil scientist's site evaluation runs $400–900 in WNC. Commission BEFORE you list raw land if the lot doesn't already have an Improvement Permit. Sets buildability honestly and prevents the contract-falls-through-during-DD outcome." },

  { id: "land-013", pack: "land", front:
    "Subdivision plat restrictions — what do you check before listing?",
    back: "Minimum house size, materials restrictions, building setbacks beyond county code, architectural review board approvals, animal restrictions (chickens, livestock), RV/boat parking limits, HOA fees and authority. All bind future buyers — get a copy of the covenants in the listing file." },

  { id: "land-014", pack: "land", front:
    "Buyer asks if a vacant lot has electrical service. How do you verify?",
    back: "Call the relevant electric co-op for the area (Haywood EMC, Blue Ridge EMC). Request a service availability quote: anywhere from no charge (existing pole at the lot line) to $5–15K (long line extension over private land). Disclose status BEFORE contract to avoid surprises." },

  { id: "land-015", pack: "land", front:
    "Spring, creek, or stream crossing the property — what's the implication?",
    back: "Riparian buffer rules apply — typically 30–50 ft of undisturbed vegetation along streams, state-protected. Owner can't clear within the buffer. Plus possible FEMA flood mapping. Disclose, reference on the listing, and don't market 'cleared building site' near a stream." },

  // ─── Inspections & Reports deepening (+11 to reach 15) ───────────────
  { id: "inspect-005", pack: "inspect", front:
    "Where do you start when a buyer hands you a 60-page inspection report?",
    back: "The Executive Summary at the front — 3–5 pages flagging major issues, safety concerns, and recommended specialists. That section drives 90% of negotiation. The bulk of the report is photographic documentation; skim, don't memorize." },

  { id: "inspect-006", pack: "inspect", front:
    "Major issue vs. cosmetic issue — what's the negotiation difference?",
    back: "Major: structural movement, water intrusion, electrical hazard, HVAC at end of life, roof failure. Negotiable for repair OR credit. Cosmetic: paint, finishes, scratches, normal wear. Generally NOT negotiable — buyer saw it at showing. Strong listing agents push back on cosmetic asks with rationale." },

  { id: "inspect-007", pack: "inspect", front:
    "Inspector wrote 'recommend specialist' — what now?",
    back: "Inspector flagged a concern beyond their general scope. Common callouts: structural engineer (foundation cracks), HVAC technician (system age/failure), licensed plumber (sewer scope), electrician (panel concerns), mold assessor, asbestos lab. Schedule the specialist BEFORE due diligence ends — that's the buyer's window." },

  { id: "inspect-008", pack: "inspect", front:
    "Sewer scope inspection — what is it and when do you push for one?",
    back: "Camera inspection of the lateral line from house to either the municipal main or the septic tank. ~$200–400. Catches root intrusion, breaks, bellies (low spots that pool waste). Push for it on homes 25+ years old or where the seller doesn't know recent history." },

  { id: "inspect-009", pack: "inspect", front:
    "Specialist consultations during DD — what should the buyer budget?",
    back: "Structural engineer: $300–600. HVAC tech: $100–200. Sewer scope: $200–400. Mold assessor: $300–500. Geotechnical/foundation: $400–800. Asbestos lab: $200–400. Budget $500–2K of DD-period costs if the home is older or has flags." },

  { id: "inspect-010", pack: "inspect", front:
    "Repair Request — what's reasonable for a buyer to ask, and what's overreach?",
    back: "REASONABLE: safety items (active leaks, exposed wiring, broken locks), code violations, major systems failing, items contractually warranted. OVERREACH: cosmetic, age-appropriate wear, items the buyer should have noticed at showing. Strong listing agents counter overreaches with rationale and a credit limit." },

  { id: "inspect-011", pack: "inspect", front:
    "Repair credit vs. actual repair — which favors which party?",
    back: "CREDIT (seller gives buyer money at closing): faster, fewer punch-list disputes, buyer hires their own contractor and gets to choose quality. Favors the SELLER's timeline. ACTUAL repair (seller hires contractor before closing): seller controls cost but is on the hook for workmanship. Favors the BUYER's leverage. Credit is usually the cleaner outcome." },

  { id: "inspect-012", pack: "inspect", front:
    "What's the difference between a pre-listing inspection and a buyer's inspection?",
    back: "Pre-listing: seller pays $400–700, gets findings BEFORE listing, fixes/discloses, markets as 'pre-inspected.' Buyer's: during DD, buyer pays, results go to buyer first, drive negotiation. Both are common in WNC at $500K+. Brandi can recommend pre-listing on properties where surprises would kill the sale." },

  { id: "inspect-013", pack: "inspect", front:
    "Seller wants to list 'as-is.' What does that mean for the inspection process?",
    back: "Seller is signaling: no repairs. Buyer can still inspect and back out during DD by forfeiting the DD fee. 'As-is' is common on estates, foreclosures, fixer-uppers. NC standard contract allows the AS-IS designation. Disclose loudly in the listing remarks; expect buyer concession requests anyway." },

  { id: "inspect-014", pack: "inspect", front:
    "4-point inspection — what is it and when does it come up?",
    back: "Condensed inspection covering roof, electrical, plumbing, HVAC. Required by some insurance carriers for homes 25+ years old, often at policy renewal. NOT a substitute for a full home inspection — buyers who skip the full inspection because they 'have a 4-point' miss everything else." },

  { id: "inspect-015", pack: "inspect", front:
    "Inspection report retention — how long should the seller keep it?",
    back: "Pre-listing inspection: retain through closing + 7 years (NC statute of limitations on real estate fraud is 4 years for some claims, 7 for others — keep the longer window). Buyer's inspection: their record. Both belong in the seller's house file along with permits, warranties, and pump records." },

  // ─── Closing Process deepening (+10 to reach 15) ─────────────────────
  { id: "closing-006", pack: "closing", front:
    "Closing Disclosure (CD) — when does the buyer have to receive it?",
    back: "At least 3 BUSINESS days before closing — federal requirement (TRID). The lender prepares and delivers. Final review of loan terms, all fees, cash-to-close. Material changes inside the 3-day window restart the timer and can push closing." },

  { id: "closing-007", pack: "closing", front:
    "Where does earnest money sit during the contract period?",
    back: "In escrow, held by the listing agent's broker, the buyer's broker, or the attorney — per the contract. Released ONLY at closing. If the contract terminates, distribution is per the contract terms OR by court order if disputed. Listing agent doesn't 'own' it; their broker holds it in trust." },

  { id: "closing-008", pack: "closing", front:
    "Mortgage payoff at closing — how does it actually work?",
    back: "Attorney requests a payoff statement from the seller's lender (good through a specific date). Includes principal + interest accrued through closing + any prepayment penalties. Attorney wires payoff at closing; seller signs the authorization. Seller is on the hook if the payoff figure is wrong — confirm." },

  { id: "closing-009", pack: "closing", front:
    "NC excise (revenue) tax — exact calculation, who pays?",
    back: "$1 per $500 of sale price (rounded up), paid by the SELLER. A $500K sale = $1,000 excise tax; a $383,500 sale = $767 (price rounded up to next $500). Same as saying $2 per $1,000. Recorded with the deed at the county registry." },

  { id: "closing-010", pack: "closing", front:
    "Recording fees in Macon County — what to expect on the net sheet?",
    back: "Roughly $26 for the first page + $4 each additional page on the deed. Deed of trust (mortgage) recording is separate and paid by the buyer. Budget $30–50 in the seller's net sheet for deed recording — small but always present." },

  { id: "closing-011", pack: "closing", front:
    "Multiple walk-throughs before closing — how do you handle a buyer who keeps asking?",
    back: "Standard is ONE walk-through 24–48 hours before closing. Earlier walks are a buyer-agent request and seller's discretion (the listing is past showing phase). Excessive walks signal buyer cold-feet — don't accommodate unconditionally; a 'sure, we'll see what we can do' protects the seller." },

  { id: "closing-012", pack: "closing", front:
    "Power of Attorney at closing — when needed and how to set up?",
    back: "When buyer or seller can't sign in person (out-of-state, military, medical). MUST be a Limited POA naming the specific signer and specific property — not a general POA. Attorney drafts and notarizes. Start at least 2 weeks before closing; lender approval often required." },

  { id: "closing-013", pack: "closing", front:
    "Key handoff after closing — what's standard practice?",
    back: "Per the NC standard contract: keys delivered at closing or as agreed. Many sellers leave keys at the property in a lockbox post-closing; some hand them at the closing table. Document the delivery in writing. Possession is usually same-day unless there's a recorded rent-back." },

  { id: "closing-014", pack: "closing", front:
    "1099-S — what is it and who issues it?",
    back: "IRS form reporting the gross proceeds of a real estate sale. The attorney or closing agent issues it to the seller. Seller takes it to their tax preparer. Reminder for sellers: the $250K single / $500K married capital gains exclusion on a primary residence (lived in 2 of last 5 years) often makes the tax bite zero." },

  { id: "closing-015", pack: "closing", front:
    "Seller wants to stay in the house after closing — what's the mechanism?",
    back: "A rent-back agreement (NC NCAR Form 2A12-T or contract addendum). Seller stays for N days post-closing, pays daily rent (often $0–100/day, sometimes a security deposit). Cap at 60 days — beyond that, lender may treat the property as non-owner-occupied and there's insurance complication." },

  // ─── STR Investor deepening (+7 to reach 12) ─────────────────────────
  { id: "str-006", pack: "str", front:
    "Macon vs. Buncombe vs. Highlands STR rules — quick mental model?",
    back: "Macon: most permissive, no countywide ban or permit fee. Buncombe: permit required, density limits in some areas. Highlands (town): outright prohibits STR in residential zones. HOAs in gated communities (Mountaintop, Wade Hampton, HCC) often prohibit too — check covenants always." },

  { id: "str-007", pack: "str", front:
    "STR comp methodology — how do you value vs. a long-term-rental comp?",
    back: "STR uses gross revenue (AirDNA, Airbnb/VRBO data) and a cap rate. LTR uses simple monthly rent × 12 ÷ price. STR cap rates in WNC: 6–12% gross. LTR: 4–7%. STR is higher return but more operating risk, more management labor, more wear-and-tear." },

  { id: "str-008", pack: "str", front:
    "Insurance for a property used as an STR — what's different?",
    back: "Standard homeowner's policy DOES NOT cover STR use; claims will be denied if rented commercially. Owner needs commercial liability OR a specialty STR carrier (Proper Insurance, Slice, CBIZ). Premiums 2–3× standard homeowners. DSCR lenders require it on file." },

  { id: "str-009", pack: "str", front:
    "What does an STR property manager actually do for their 20–30%?",
    back: "Guest communications, cleanings and turnover, dynamic pricing (Wheelhouse, PriceLabs), listing maintenance (photos, copy, channel manager), maintenance dispatch, supply restocking, damage assessment, review responses. Owner-managed = 10–20 hrs/wk of real labor for a 3-property portfolio." },

  { id: "str-010", pack: "str", front:
    "WNC-specific STR maintenance items that surprise out-of-state investors?",
    back: "Hot tub maintenance ($100–200/mo professional). HVAC air filter monthly during peak season. More frequent septic pumping (15–20% more with high turnover). Exterior pest control. Snow removal contracts (winter). Driveway gravel/grading (heavy on mountain roads). Wood stove inspection annually." },

  { id: "str-011", pack: "str", front:
    "Airbnb vs. VRBO vs. Booking.com — strategic differences for WNC?",
    back: "Airbnb: highest volume, lowest fees (3% host), good for solo/couples, mobile-first. VRBO: family/group focus, longer stays, higher fees (5% host), aligns with WNC cabin market. Booking.com: international, hotel-style. Most successful WNC operators cross-list Airbnb + VRBO; Booking.com for international leaf-peepers." },

  { id: "str-012", pack: "str", front:
    "Off-season strategy for a WNC STR — what works Nov–March?",
    back: "Drop rates 30–50%. Monthly discounts (long-stay remote workers, snowbirds). Target seasonal niches: holiday family rentals (Thanksgiving/Christmas), New Year retreats, Valentine's couples. Some owners close completely Dec–Feb to do maintenance. Listing at peak rates in low season kills booking-ratio metrics — don't." },

  // ─── BATCH 4: DEEP construction-side fluency ─────────────────────────
  // Visual ID, era recognition, numeric specs, hard-to-retain technical
  // distinctions — the stuff a non-construction-background agent has to
  // drill repeatedly to keep cold.

  // ─── Septic deepening (+10 to reach 22) ──────────────────────────────
  { id: "septic-013", pack: "septic", front:
    "Distribution box (D-box) — what does it look like and what's its job?",
    back: "Buried concrete or plastic box near the tank, with one input line from the tank and multiple outputs feeding the drainfield lines. Job: distribute effluent evenly across all field lines. Failure mode: the box tilts and dumps everything into one line, drowning that section of the field." },

  { id: "septic-014", pack: "septic", front:
    "How often does a typical NC septic tank need pumping, and where do you find the last date?",
    back: "Every 3–5 years for a typical household. Frequency depends on tank size, household size, and water use. Last pump date is on the Operation Permit if the county tracks it; otherwise from the seller's records. Pull both before listing." },

  { id: "septic-015", pack: "septic", front:
    "A septic alarm panel is lit or beeping. What does it mean and what's the move?",
    back: "Alarm indicates a problem — high water level, pump failure, or float malfunction. Common on LPP, drip, and aerobic systems. Resetting it without diagnosing is rarely the answer — call the installer. ALWAYS disclose if active during a listing." },

  { id: "septic-016", pack: "septic", front:
    "Septic system design capacity in NC — how is it calculated?",
    back: "120 gallons per day per bedroom for a typical residential system. 3BR home = 360 gpd design. Larger or higher-use buildings (B&Bs, group homes) require special engineered design. This is why bedroom count is permit-tied — it dictates capacity." },

  { id: "septic-017", pack: "septic", front:
    "Septic vs. sewer — the financial difference for a buyer over 10 years?",
    back: "Septic: $0 monthly, but $300–500 every 3–5 years for pumping, plus possible drainfield repair ($5–25K) every 20–30 years. Sewer: $30–80/month plus connection fees. Over 10 years, septic typically costs less in total — but the variability (a failed drainfield) is the real risk." },

  { id: "septic-018", pack: "septic", front:
    "Septic setback rules — distances to property line, well, water bodies?",
    back: "Tank: 5 ft from property line typical. Drainfield: 10 ft from property line, 50 ft from a well, 100 ft from any water body or stream. Critical for any new build, addition, or pool. Reduce-these-and-the-permit-is-denied." },

  { id: "septic-019", pack: "septic", front:
    "Buyer asks: 'What's a reserve area?' What do you tell them?",
    back: "A designated portion of the property held in reserve for a FUTURE drainfield if the current one fails. Required on most NC properties. Cannot be built on, paved over, or have heavy traffic. Shown on the Improvement Permit map — pull it and walk the boundary with the buyer." },

  { id: "septic-020", pack: "septic", front:
    "Six walkthrough signs of a failing septic system?",
    back: "Wet or soggy patches over the drainfield. Sewage smell outside (especially after rain). Slow drains throughout the house. Backups in the lowest fixtures (basement, ground-floor). Unusually lush green grass right over the field lines. Gurgling toilets when sinks drain." },

  { id: "septic-021", pack: "septic", front:
    "Septic tank materials in WNC — concrete vs. plastic vs. fiberglass?",
    back: "Concrete: most common, 30–40 year life, can crack on settlement. Plastic (polyethylene): lighter, 30+ year life, can shift if not properly bedded. Fiberglass: very durable, 50+ year life, expensive. Most pre-2000 WNC tanks are concrete; newer installs often plastic." },

  { id: "septic-022", pack: "septic", front:
    "Effluent filter — what is it and why does it matter?",
    back: "A screen-like filter installed at the tank outlet to prevent solids from reaching the drainfield. Not legally required but increasingly standard on new installs. Adds $50–200 to install; reduces drainfield clogging risk dramatically. Pull-and-rinse maintenance every 1–2 years." },

  // ─── Wells deepening (+8 to reach 19) ────────────────────────────────
  { id: "well-012", pack: "wells", front:
    "Static water level vs. total well depth — what's the difference and why does it matter?",
    back: "Total depth: how far down the well is drilled. Static water level: where the water naturally sits in the casing when nothing is pumping. The water-bearing zone is between them. Drop in static level over the years = aquifer stress signal." },

  { id: "well-013", pack: "wells", front:
    "Bladder tank vs. pressure tank — what's the practical difference?",
    back: "Pressure tank (older): air bubble compresses as water enters, pushes back on demand. Loses air over time, prone to waterlogging and short-cycling. Bladder tank (modern): rubber bladder separates air and water, never waterlogs, much longer life. Most NEW wells use bladder tanks." },

  { id: "well-014", pack: "wells", front:
    "Typical lifespan of a submersible well pump?",
    back: "15–25 years for a quality pump in a deep well. Premium replacement runs $1,500–3,500 installed (pump + pull cost + wire). Failure mode: pump won't start, or starts but no water. Pulling and inspecting a pump from a 400-ft well is a real day's work." },

  { id: "well-015", pack: "wells", front:
    "Rapid pump cycling — what does it signal?",
    back: "Pump starting and stopping every few seconds = problem. Likely causes: waterlogged pressure tank, leaking pressure switch, leak in well casing or piping, or a failing pump. Rapid cycling burns out pump motors fast. Diagnose and fix immediately." },

  { id: "well-016", pack: "wells", front:
    "Galvanized steel vs. PVC well casing — which is which, which is worse?",
    back: "Galvanized: pre-1990 standard, rusts internally, 30–50 year life, often the source of rusty water in older wells. PVC: modern standard, doesn't rust, 75+ year life, cheaper to install. WNC mountain wells in bedrock can use steel for the upper section through soil." },

  { id: "well-017", pack: "wells", front:
    "Iron/manganese staining on fixtures — what's it tell you?",
    back: "Reddish-brown (iron) or black (manganese) staining on toilets, tubs, sinks indicates dissolved metals in the well water. Not a health concern at typical levels, but a major aesthetic issue. Treatment: water softener or iron filter ($800–2,500 install). Disclose as a known condition." },

  { id: "well-018", pack: "wells", front:
    "Rotten-egg smell from a well — diagnosis?",
    back: "Hydrogen sulfide (H₂S) from sulfur bacteria in the well or hot water heater. Most often: bacteria in the water heater anode rod (cheap fix: change anode). Less often: bacteria in the aquifer (treatment: chlorination + filter, $500–1500). Always test the hot water alone first." },

  { id: "well-019", pack: "wells", front:
    "Coliform vs. E. coli on a well test — what's the difference, what's required?",
    back: "Coliform (total): broad family of bacteria, MOST are harmless, just an indicator that surface water may be reaching the aquifer. E. coli: specific dangerous strain from fecal contamination — never acceptable. NC and FHA tests require ZERO of both. Coliform positive → shock chlorinate and retest; E. coli positive → real problem." },

  // ─── Foundations deepening (+8 to reach 21) ──────────────────────────
  { id: "found-014", pack: "foundations", front:
    "Frost line depth in NC mountains — what's the code requirement?",
    back: "NC mountain counties: 12 inches typical, 24 inches in higher elevations per local code. Footings MUST be below the frost line, otherwise frost heave will lift and crack the foundation. Older WNC structures with shallow footings are a common settlement source." },

  { id: "found-015", pack: "foundations", front:
    "Hairline crack vs. structural crack — how do you distinguish?",
    back: "Hairline: < 1/16 inch wide, often shrinkage cracks from concrete cure, generally cosmetic. Structural: 1/8 inch + wide, runs diagonally OR widens at one end, often accompanied by deflection or displacement. Width over 1/4 inch = structural engineer consult." },

  { id: "found-016", pack: "foundations", front:
    "Stair-step cracks in masonry — what specifically do they tell you?",
    back: "Cracks following the mortar joints in a step pattern indicate FOUNDATION MOVEMENT (typically settlement on one side). Different from vertical cracks (often shrinkage) or horizontal cracks (often lateral pressure / bowing). Stair-steps that grow over time = active settlement, structural engineer." },

  { id: "found-017", pack: "foundations", front:
    "Bowing foundation wall — what causes it and what's the fix?",
    back: "Lateral pressure from soil and water pushing in horizontally. Causes: poor drainage, hydrostatic pressure, frozen soil, vehicle vibration nearby. Bow over 2 inches = engineered repair ($5–15K). Steel I-beam bracing or carbon-fiber strap remediation. Selling needs disclosure." },

  { id: "found-018", pack: "foundations", front:
    "Termite shield — what is it and where do you look for it?",
    back: "Metal flashing between the foundation top and the sill plate. Bent edges deny termites a hidden tunnel up into wood framing. NC code REQUIRES it in some counties; older homes often skipped it. Visible from inside the crawlspace at the top of the wall. Missing shield = elevated termite risk." },

  { id: "found-019", pack: "foundations", front:
    "Footer drain vs. drain tile — same thing or different?",
    back: "Same thing, different vocab. Perforated pipe (4-inch PVC) buried alongside the footing in gravel, draining away from the home to daylight or a sump. Essential on basements and crawlspaces in WNC where groundwater is common. Missing or clogged drain tile is the #1 cause of basement water." },

  { id: "found-020", pack: "foundations", front:
    "Egress window in a basement bedroom — code requirements?",
    back: "Any room called a 'bedroom' below grade requires an egress window: minimum 5.7 sq ft opening, 24-inch minimum height, 20-inch minimum width, sill no more than 44 inches from the floor. Plus a window well if below grade with ladder. Listing a basement room as a bedroom without one = misrepresentation." },

  { id: "found-021", pack: "foundations", front:
    "Sill plate seal and termite barrier — what should you see?",
    back: "Continuous foam gasket OR sealant between concrete foundation and wood sill plate. Stops air leakage AND blocks termite entry into framing. Older WNC homes often have just wood on bare concrete — moisture wicks up, sill rots, termites find their way in. Look for it from below in the crawlspace." },

  // ─── Log Homes deepening (+10 to reach 20) ───────────────────────────
  { id: "log-011", pack: "logs", front:
    "Three common WNC log species — properties and pricing?",
    back: "Eastern white pine: most common, decent rot resistance, accepts stain well, mid-priced. Western red cedar: better natural rot resistance, premium price (+30%). Cypress: excellent rot resistance, very expensive, mostly southern coastal. Hemlock: cheap but rots fastest — avoid for new construction." },

  { id: "log-012", pack: "logs", front:
    "Hand-hewn vs. milled logs — how do you tell at a glance?",
    back: "Hand-hewn: irregular shapes, adze and axe marks visible on flat faces, tighter chinking lines. Often pre-1900 or modern premium build. Milled: uniform shape (round, D-shape, or square), tight machine fit, less chinking needed. Milled is post-1970 mass-market; hand-hewn is rarer and more authentic." },

  { id: "log-013", pack: "logs", front:
    "Log stain types — oil vs. water vs. UV-blocker?",
    back: "Oil-based: deep wood penetration, longest life, harder application. Water-based: easier application, faster dry, less penetration, more re-coats needed. UV-blocker: critical for south/west walls — WNC mountain sun is harsh. South-facing log walls without UV stain fade and check within 3–5 years." },

  { id: "log-014", pack: "logs", front:
    "Why is insuring a log home harder than insuring a stick-built?",
    back: "Smaller carrier pool. State Farm and Farmers will sometimes write with surcharges. Specialty markets (Foremost, Stillwater, ASI) more common. Carriers often require: chimney inspection, fire safety equipment, recent maintenance records, log condition photos. Premiums run 20–40% higher than stick-built." },

  { id: "log-015", pack: "logs", front:
    "Common log home manufacturers — and why does the brand matter?",
    back: "Real Log Homes (mass-market, very common in WNC), Honest Abe (Tennessee premium), Hearthstone (Tennessee premium, hand-hewn), Riverbend (Indiana), Lincoln Logs (older, common). Brand affects parts availability for repairs and refinishing supplies. Pre-1990 builds are often one-off with no brand support." },

  { id: "log-016", pack: "logs", front:
    "Half-log siding vs. real log construction — how do you tell?",
    back: "Half-log siding: stick-built home with half-log shaped cladding nailed to sheathing. Looks identical from outside. Tells: interior walls are plumb and standard framed, electrical outlets are in standard wall boxes, walls are 2x4 thick (not 8+). Cheaper to build, cheaper to insure, much lower maintenance." },

  { id: "log-017", pack: "logs", front:
    "Settlement gap above doors and windows in a log home — what is it?",
    back: "Engineered space (usually 2–4 inches) above each door and window framing, hidden by trim, allowing the logs to settle without crushing the framing. Older homes settle 3–6 inches over 20 years. If the framing has been screwed solid (no slip joint), windows and doors stop opening as logs settle." },

  { id: "log-018", pack: "logs", front:
    "Daubing in a log home — what is it and what's the maintenance cycle?",
    back: "Daubing is the joint material between logs (similar role to chinking in non-chink-style builds). Modern synthetic daubing lasts 20–25 years. Traditional mortar daubing cracks faster. Annual inspection for gaps, cracks, separation from log surface — water finding its way in causes rot in 2–3 years if ignored." },

  { id: "log-019", pack: "logs", front:
    "Borate-treated logs — what is it and why does it matter?",
    back: "Borate (boron compound) preservative impregnated into logs at the mill or applied to existing walls. Repels termites, carpenter ants, and powder-post beetles. Newer log homes (post-2000) often come pre-treated; older homes can be brushed or sprayed. Critical in WNC where carpenter bees and beetles are aggressive." },

  { id: "log-020", pack: "logs", front:
    "Where does a log home leak air, and how does it affect the energy bill?",
    back: "Between logs (failed chinking/daubing), at log ends/corners (notches), and through settling gaps around windows/doors. Even a 'tight' log home leaks 30–50% more air than a comparable stick-built. Energy bill on a 2,000 sqft log home runs 20–40% higher than a comparable stick-built in WNC winters." },

  // ─── Older Home Systems deepening (+8 to reach 27) ───────────────────
  { id: "older-020", pack: "older", front:
    "Cast iron drain pipe — when was it used and how do you spot it?",
    back: "Cast iron drains (waste lines) were standard pre-1960s. Looks like thick black or rust-colored pipe (3–4 inch diameter), often with bell-and-hub joints sealed by lead and oakum. Lifespan 75+ years but the rusting interior eventually pinches flow. Visible from the basement or crawlspace at the main stack." },

  { id: "older-021", pack: "older", front:
    "Knob-and-tube wiring — what does it look like and what years?",
    back: "Pre-1940s standard. Insulated single-conductor wires running on ceramic knobs (mounted to framing) and through ceramic tubes (where wires pass through joists). Visible in attics and accessible crawlspaces. Most insurance carriers won't write a policy with active knob-and-tube; flag immediately." },

  { id: "older-022", pack: "older", front:
    "Popcorn ceiling — when does the asbestos concern kick in?",
    back: "Pre-1980 popcorn ceilings frequently contain asbestos in the texture. Post-1980 ones generally don't. Federal banned asbestos in popcorn ceilings in 1977 but stock remained in use through ~1980. Always test pre-1980 popcorn before disturbing it. Removal: $3–8K typical." },

  { id: "older-023", pack: "older", front:
    "Window era ID — single-pane vs. double-pane vs. low-E?",
    back: "Single-pane: pre-1970 standard, very poor insulation (R-1). Double-pane (insulated): 1970s–present standard, R-2 to R-4. Low-E coating: post-1990 premium, reflects radiant heat, R-3 to R-5. Look at the spacer between panes for a date stamp or 'argon-filled' marking. Single-pane = energy bill flag." },

  { id: "older-024", pack: "older", front:
    "Vermiculite (Zonolite) attic insulation — visual ID?",
    back: "Loose-fill insulation that looks like small (1/4-inch) gold, brown, or silver pebbles. Pre-1990 product, much of it asbestos-contaminated from the Libby, MT mine. Never disturb. Disclose mandatory if known. Removal: $3–10K typical depending on attic size. Treat presence as a known hazard." },

  { id: "older-025", pack: "older", front:
    "Lead solder in copper plumbing — what years and how do you flag?",
    back: "Pre-1986 copper plumbing was often joined with lead-based solder (50/50 tin-lead). The federal Safe Drinking Water Act banned lead solder in 1986. Risk: lead leaching into water. Test option: lead in first-draw water sample. EPA action threshold 15 ppb. Disclose if pre-1986 home with original plumbing." },

  { id: "older-026", pack: "older", front:
    "Romex (NM-cable) era identification?",
    back: "Modern Romex: white, yellow, or orange plastic jacket (color indicates wire gauge). 1960s–80s: black or gray cloth-jacketed cable, may have brittle insulation by now. 1940s–60s: cloth-wrapped rubber-insulated. Pre-1940s: knob-and-tube. Each era has its own deterioration concerns; flag pre-1980 cable for inspection." },

  { id: "older-027", pack: "older", front:
    "Pull-chain breaker / fuse box vs. modern panel?",
    back: "Pre-1960 electrical service often used screw-in fuses or pull-chain main disconnects rather than circuit breakers. Common at 30–60 amp service. NOT inherently dangerous if intact, but inadequate for modern loads. Insurance carriers often surcharge or refuse. Recommendation: full panel upgrade with 200A service ($2–4K)." },

  // ─── HVAC deepening (+8 to reach 18) ─────────────────────────────────
  { id: "hvac-011", pack: "hvac", front:
    "AC/heat-pump refrigerant types — R-22 vs. R-410A vs. R-454B?",
    back: "R-22 (Freon): pre-2010, ozone-depleting, banned for new equipment 2020. R-410A (Puron): 2010–2024 standard. R-454B (Opteon XL41) and R-32: 2025+ phased in. Old R-22 systems are increasingly expensive to recharge ($200–500 per pound; system holds 4–8 lbs). Flag R-22 = replace soon." },

  { id: "hvac-012", pack: "hvac", front:
    "Heat pump backup heat strip — what is it and when does it come on?",
    back: "Electric resistance coils in the air handler that engage when the heat pump can't keep up (below ~25°F outside, or recovering from setback). Big energy hog — uses 3× the electricity of the heat pump alone. Auxiliary heat light on the thermostat = strips engaged. Old or undersized heat pump = runs strips a lot in WNC winter." },

  { id: "hvac-013", pack: "hvac", front:
    "Air handler in the attic — what's the WNC concern?",
    back: "Common in older WNC homes. Three risks: condensation from cold supply ducts in hot/humid attics causing mold or wood rot. Inaccessibility for service. Inability to insulate the equipment well. Modern best practice: locate the air handler in conditioned space (closet, basement). Attic air handlers = mid-life HVAC replacement priority." },

  { id: "hvac-014", pack: "hvac", front:
    "Failed AC capacitor — what are the symptoms?",
    back: "Outdoor unit hums but the fan won't spin. Or AC runs briefly then trips. Capacitor is a $20 part with a $200 service-call labor (or $10 DIY if you know how — but it stores a charge, don't recommend to clients). Common 6–10 year failure point. Easy fix but spotting it early prevents compressor damage." },

  { id: "hvac-015", pack: "hvac", front:
    "Ductwork material types — what to look for in a WNC crawlspace?",
    back: "Sheet metal (galvanized): durable, long-lasting, most common in older builds. Flex duct (insulated plastic): cheap, easy to install, prone to kinks/punctures, common in 1990s+ builds. Fiberboard duct: avoid — degrades and can grow mold. Always look for insulation jacket condition (R-6 to R-8 minimum)." },

  { id: "hvac-016", pack: "hvac", front:
    "Mini-split brand reliability ranking — what to recommend?",
    back: "Premium tier (12–15 yr life, parts available): Mitsubishi Electric, Daikin, Fujitsu. Mid-tier: LG, Samsung. Budget tier (8–10 yr life, parts iffy): Pioneer, Senville, MrCool. Brandi's recommendation framework: 'Premium for a primary heat system, budget OK for a single-room supplement.'" },

  { id: "hvac-017", pack: "hvac", front:
    "Boiler / radiant heat system — when do you see one in WNC and what's the concern?",
    back: "Less common than heat pumps but exists in older homes and some custom builds. Hot water circulated through baseboards or in-floor PEX. Pros: even heat, quiet, no air movement. Cons: high install cost, limited contractor pool, harder to add AC. Boiler age: 25–40 year life. Check for any signs of leaks at fittings." },

  { id: "hvac-018", pack: "hvac", front:
    "How do you read a furnace or air handler's manufacture date?",
    back: "Manufacturer label on the unit (often inside the access panel). Look for 'Mfg Date' or read the serial number — first four digits often encode week + year, but the format varies by brand. Trane: serial number positions 2–3 = year. Carrier: weeks 1–2 = month, 3–4 = year. Photograph the label and decode online." },

  // ─── Walkthrough Q&A deepening (+10 to reach 23) ─────────────────────
  { id: "ego-014", pack: "ego", front:
    "Buyer asks 'what's that switch for?' — common WNC mystery switches?",
    back: "Common culprits: bathroom exhaust fan timer, attic fan switch, garbage disposal, outdoor light circuit, well pump cutoff (in a panel box), septic pump alarm reset, doorbell transformer. If genuinely unknown: 'Let me check the panel diagram — could be an old circuit. Always test before sale to confirm.'" },

  { id: "ego-015", pack: "ego", front:
    "Buyer notices a door that sticks — calibrated reply?",
    back: "\"Could be: seasonal humidity expanding the wood (cycles every year, harmless), settlement of the framing (worth flagging), missing slip joint on a log home (real fix), or just a misaligned strike plate. The inspector will check if it's structural.\"" },

  { id: "ego-016", pack: "ego", front:
    "Buyer asks how old the water heater is — how do you tell at a glance?",
    back: "Look at the manufacturer label: most encode the date in the serial number. Rheem: month/year explicit. AO Smith: first 4 of serial = year + week. Bradford White: a letter code = year (chart online). Photograph the label and decode. 10+ years = recommend replacement budget." },

  { id: "ego-017", pack: "ego", front:
    "Moisture on the inside of a window in winter — what does it indicate?",
    back: "Single-pane window OR humidity too high indoors OR failed seal on a double-pane (fog between panes). On a triple-pane: usually fine condensation. Persistent condensation that pools = wood rot risk. If between panes: seal failure ($400–800 per window to replace insulated glass unit)." },

  { id: "ego-018", pack: "ego", front:
    "Buyer asks about a room addition — what questions do you ask before answering?",
    back: "Was it permitted? (Verify with county records.) Does it meet code (egress, heating, electrical)? Is it on the same foundation type or a different one (common settlement issue)? Is it within the home's GLA per ANSI? Unpermitted additions are the #1 cause of late-stage deal complications." },

  { id: "ego-019", pack: "ego", front:
    "'These floors are really creaky' — what's the inspector going to look for?",
    back: "Subfloor squeaking against nails/screws (cosmetic, easy fix with screws and trim adhesive). Joist movement (more significant — could be undersized joists, broken bridging, or sill rot). Loose joist hangers (medium severity). Severe creaking with deflection = structural eng. consult." },

  { id: "ego-020", pack: "ego", front:
    "Buyer wants to put in a pool — what's your immediate question?",
    back: "Where's the septic and its setback? Pool plus equipment needs to clear: drainfield (50 ft setback typical), reserve area, and well (75–100 ft). On a typical 1/2-acre lot, septic constraints often kill the pool plan. Always check the IP map before promising 'plenty of room.'" },

  { id: "ego-021", pack: "ego", front:
    "Buyer asks if the basement is waterproofed — how do you read it?",
    back: "Interior signs: dehumidifier in active use, sump pump, evidence of past water (efflorescence on walls, water stains on floor). Exterior signs: drain tile visible at the footing, foundation coating (black tar OR membrane). 'Waterproofed' is a continuum — 'managed' is more accurate. Inspector confirms." },

  { id: "ego-022", pack: "ego", front:
    "'What's this knob/dial in the basement?' — common WNC mystery controls?",
    back: "Whole-house humidifier setpoint (set to ~35–40% in winter). HVAC damper for zoning. Hot water recirc pump timer. Well pump pressure regulator (don't touch — it's set). Water softener regen timer. If unsure: 'Let me trace it to the appliance — could be HVAC, plumbing, or well-related.'" },

  { id: "ego-023", pack: "ego", front:
    "Second floor noticeably warmer than first — what causes it and what fixes it?",
    back: "Heat naturally rises, but also: undersized return air on second floor, supply ducts losing pressure, attic insulation insufficient (R-38 min in WNC), single-zone HVAC trying to serve two floors. Fixes: add zoning ($2–4K), increase attic insulation, balance dampers. Always recommend whole-house HVAC assessment." },

  // ─── Post-Helene & Insurance deepening (+8 to reach 14) ──────────────
  { id: "helene-007", pack: "helene", front:
    "Which insurance carriers are tightening WNC underwriting post-Helene?",
    back: "Major national carriers (State Farm, Allstate, Liberty Mutual) have applied new flood and slope underwriting questions across western NC. Some carriers paused new policies in the highest-loss counties (Buncombe, Yancey, Avery). NC Joint Underwriting Association (FAIR Plan) is the carrier of last resort." },

  { id: "helene-008", pack: "helene", front:
    "Wind/hail deductible — how is it different and why does it matter?",
    back: "Many NC carriers carve wind/hail out as a SEPARATE deductible (often 1–5% of dwelling coverage, not a flat dollar amount). On a $500K home, that's $5–25K out-of-pocket per claim — vastly higher than the standard $1–2K all-other-perils deductible. Always pull declarations page to verify." },

  { id: "helene-009", pack: "helene", front:
    "Flood insurance — NFIP vs. private carriers, what's the difference?",
    back: "NFIP (National Flood Insurance Program, FEMA): standard floor flood coverage, max $250K dwelling. Federally subsidized in some areas. Private flood (Neptune, Wright, Aon Edge, etc.): can offer higher limits, competitive pricing, and faster claims. Both rate based on flood zone. Outside SFHA: still buyable, but often skipped." },

  { id: "helene-010", pack: "helene", front:
    "How much does being in a SFHA (flood zone AE, A) bump the premium?",
    back: "Annual NFIP premium can run $1,000–4,000+ for a single-family home in AE vs. $400–800 outside SFHA — meaningful for buyer's monthly DTI on the loan. Lender REQUIRES flood insurance in SFHA. Get a quote BEFORE the contract goes hard." },

  { id: "helene-011", pack: "helene", front:
    "NC insurance non-renewal — what notice does the homeowner get?",
    back: "Carrier must provide at least 45 days written notice before non-renewing a policy in NC. Reason must be specified (loss history, increased risk, etc.). Buyer can appeal to NC Department of Insurance. If a non-renewal happens during a listing, disclose to potential buyers — insurability is at risk." },

  { id: "helene-012", pack: "helene", front:
    "Property within 100 feet of a stream — underwriting implications post-Helene?",
    back: "Many WNC carriers now ask: 'is the property within 100/200/500 feet of a stream or river?' Underwriting may require: higher deductible, surcharge, or refusal. Pre-list step: ask seller for current declarations page and check for any underwriting notes. Stream-adjacency was the #1 Helene loss category." },

  { id: "helene-013", pack: "helene", front:
    "Cut-and-fill foundation pad — what's the insurance concern?",
    back: "When a flat building site was created by cutting away the uphill side and filling the downhill side, the fill side can settle, shift, or fail in heavy rain. Post-Helene, carriers are flagging these on inspection. Look for: visible retaining walls below the foundation, drainage features, signs of slope movement." },

  { id: "helene-014", pack: "helene", front:
    "Wildfire defensible space — what's the basic rule and why does Brandi need it?",
    back: "Zone 1 (0–30 ft from house): remove flammable vegetation, dead branches, accumulated needles. Zone 2 (30–100 ft): thin trees, remove ladder fuel. Zone 3 (beyond): reduce dense brush. Mountain insurance carriers are increasingly inspecting for this. Disclose if a property is in a wildfire-risk zone (Macon has WUI areas)." },

  // ─── NEW pack: HOA Knowledge (+8 cards) ──────────────────────────────
  { id: "hoa-001", pack: "hoa", front:
    "Major gated communities in Macon/Jackson counties Brandi should know cold?",
    back: "Highlands CC, Mountaintop Golf & Lake Club, Wade Hampton Golf Club (Cashiers), Lake Toxaway CC, Connestee Falls (Brevard), Cullasaja Club, Bear Lake Reserve, Trillium, Old Edwards Club. Each has distinct HOA rules, fees, and STR/rental restrictions. Listing in any of these = pull the covenants first." },

  { id: "hoa-002", pack: "hoa", front:
    "NC HOA disclosure at listing — what's required?",
    back: "If the property is in an HOA, seller must complete and deliver the Owners' Association Disclosure (part of NCRPOADS). Includes: HOA name and contact, fee amount and frequency, special assessments planned, transfer fees at closing, copy of the covenants and current rules. Mandatory before offer is signed." },

  { id: "hoa-003", pack: "hoa", front:
    "HOA fee disclosure — what's typically included and what's extra?",
    back: "Monthly/annual dues usually cover: common area maintenance, security gate, road maintenance (private), shared amenities. EXTRA: water/sewer in some communities, club dues (golf, marina), special assessments for repairs. Always pull current year's budget and 3-year history to show buyer the trend." },

  { id: "hoa-004", pack: "hoa", front:
    "Architectural Review Board (ARB) — what does it do and why does Brandi mention it?",
    back: "Reviews and approves any exterior modifications: paint color, fence, addition, landscaping, even mailbox style. ARB approval process can take 30–90 days. Buyers who plan modifications need to budget for ARB time AND the cost of plans. Always disclose ARB existence and rules to buyers." },

  { id: "hoa-005", pack: "hoa", front:
    "HOA reserve study — what is it and why does it matter at sale?",
    back: "A reserve study is a forward-looking budget for major repairs (roads, clubhouse, pool, infrastructure). If reserves are inadequate, special assessments are coming. Ask for the most recent reserve study during the listing appointment. A poorly-funded HOA = buyer's-side red flag, can affect financing." },

  { id: "hoa-006", pack: "hoa", front:
    "STR rules in WNC HOAs — what's typical?",
    back: "Most premium gated communities (Highlands CC, Wade Hampton, Mountaintop) PROHIBIT short-term rentals via covenant — owners can only do long-term leases (often 6+ months). Some allow STR but require registration. Always check the covenants page on rentals before marketing to STR investors." },

  { id: "hoa-007", pack: "hoa", front:
    "HOA covenant enforcement — what powers does an HOA have?",
    back: "HOAs can: fine for violations, place liens on the property, ultimately foreclose for unpaid dues. Most enforce via written warnings → fines → liens escalation. NC HOAs must follow due process under the Planned Community Act. Buyers should review enforcement history (board minutes) to gauge how strict the HOA is." },

  { id: "hoa-008", pack: "hoa", front:
    "HOA transfer fee at closing — typical amount and who pays?",
    back: "WNC HOAs often charge a transfer fee at closing: $250–1,500 typical, sometimes higher for premium clubs ($5K–25K club initiation fees on top). Plus a capital contribution (1–3 months dues prepaid). Always negotiated in contract; default is buyer pays unless specified. Surfaces in NC Form 2-T addendum." },

  // ─── BATCH 5: filling out the last shallow packs ─────────────────────
  // WNC Climate, HOA, Forms, CMA. After this every pack is ≥12 cards.

  // ─── WNC Climate deepening (+6 to reach 12) ──────────────────────────
  { id: "wnc-007", pack: "wnc", front:
    "Fog patterns in WNC — when and where, and what does it mean for a listing?",
    back: "Morning valley fog is common in coves and along rivers in late spring through autumn — burns off by 10–11 AM. Ridge homes typically rise above the fog and have clear morning sun. Listing photos: shoot ridge homes at sunrise, shoot cove homes after the fog burns. Buyers should expect fog as a normal feature, not a defect." },

  { id: "wnc-008", pack: "wnc", front:
    "North-facing vs. south-facing slope home — what's the practical difference?",
    back: "South-facing: more sun, warmer winters, faster snowmelt, drier, garden-friendly, mostly preferred. North-facing: cooler summers, slower snowmelt (can stay icy weeks longer), more moss/mildew, but more privacy and mature shade. Solar potential is dramatically better on south slopes." },

  { id: "wnc-009", pack: "wnc", front:
    "WNC winter road closures — what should an out-of-state buyer expect?",
    back: "State-maintained roads (NCDOT) are plowed within hours of snow. Private roads in subdivisions vary widely — some HOAs maintain, others leave it to owners. Above 3,500 ft, expect occasional 1–3 day closures during ice events. Always ask the HOA or seller about typical winter access disruption." },

  { id: "wnc-010", pack: "wnc", front:
    "Frost dates in Macon County — first and last typical?",
    back: "Last spring frost: April 15–May 5 (later at higher elevations). First fall frost: October 5–25. Frost-free growing season: about 160–180 days at lower elevations, 130–150 at 4,000 ft. Important for buyers thinking about gardens, fruit trees, or season-extending greenhouse setups." },

  { id: "wnc-011", pack: "wnc", front:
    "Prevailing wind direction in WNC and why does it matter?",
    back: "Predominantly westerly (W to SW). Affects: which side of the house gets weather (siding/staining wear), where to site a wood stove chimney (downwind), where to place a garden windbreak, and orientation of any solar array (south-facing). West-side log walls fade and weather fastest." },

  { id: "wnc-012", pack: "wnc", front:
    "Snow accumulation by elevation in WNC — what does a typical winter look like?",
    back: "Under 2,500 ft: a few light dustings, occasional 1–3\" event, melts in days. 2,500–3,500 ft: 5–15\" total winter accumulation, some 4–6\" single events. 3,500–4,500 ft: 20–40\" accumulation, periodic ice storms. Above 4,500 ft: 40–80\"+ accumulation, real winter conditions. Sets buyer expectations realistically." },

  // ─── HOA deepening (+6 to reach 14) ──────────────────────────────────
  { id: "hoa-009", pack: "hoa", front:
    "How do you read an HOA's financial health before recommending an offer?",
    back: "Pull: current year operating budget, last 3 years of audited financials, reserve study, any pending or planned special assessments, current % delinquencies on dues. Healthy: full funding of reserve study recommendations, <5% delinquency, no pending special assessments. Red flags: reserves <50% funded, recurring assessments." },

  { id: "hoa-010", pack: "hoa", front:
    "FHA approval for an HOA condo or PUD — why does it matter?",
    back: "FHA buyer can only use FHA financing on a property in an HOA-approved community. Check: HUD's FHA Approved Condo list. Many WNC HOAs are NOT approved (expensive process). Means FHA buyers are off the table — narrows your buyer pool. Disclose to seller during listing appointment." },

  { id: "hoa-011", pack: "hoa", front:
    "HOA special assessment — what is it and how do you spot a coming one?",
    back: "Above-budget charge to all owners for an unbudgeted project (re-roof, road repair, infrastructure replacement). Signs it's coming: aging amenities, deferred maintenance visible, underfunded reserves, board minutes discussing big-ticket items. Ask for last 12 months of board meeting minutes before the contract." },

  { id: "hoa-012", pack: "hoa", front:
    "Age-restricted (55+) HOA — what does it actually mean?",
    back: "Under federal Housing for Older Persons Act (HOPA): at least 80% of occupied units must have at least one resident age 55+. Community must publish and enforce. Tight restrictions on under-19 occupants. Limits the buyer pool significantly. Disclose age-restriction status in listing remarks." },

  { id: "hoa-013", pack: "hoa", front:
    "What's a 'capital contribution' fee at an HOA closing?",
    back: "One-time fee at closing that funds the HOA's capital reserves — distinct from monthly/annual dues. Typically 1–3 months of dues. Common in newer or premium WNC communities (Mountaintop, Bear Lake Reserve). Always disclosed in the NCRPOADS HOA section; buyer typically pays." },

  { id: "hoa-014", pack: "hoa", front:
    "How does the HOA covenant amendment process work and why does it matter to a buyer?",
    back: "Typically requires 2/3 or 3/4 vote of owners to amend covenants. Means existing rules are sticky — STR allowed today probably still allowed in 5 years, but conversely an unwanted rule (e.g., restrictive paint colors) is hard to remove. Buyer should review covenants assuming they'll persist for their hold period." },

  // ─── NC Forms deepening (+5 to reach 18) ─────────────────────────────
  { id: "form-014", pack: "forms", front:
    "Lead-based paint disclosure — what's the exact timing requirement?",
    back: "Federal Title X requires delivery of the lead-based paint disclosure pamphlet and disclosure form to the buyer BEFORE the contract is binding (offer to purchase). Pre-1978 homes only. Seller and listing agent both sign. 10-day buyer inspection right for lead is independent and runs from the disclosure date." },

  { id: "form-015", pack: "forms", front:
    "Co-broke compensation post-NAR settlement — where can it be advertised?",
    back: "After Aug 17, 2024: NOT in the MLS, NOT on listing portals (Zillow, Realtor.com). Compensation offers between listing and buyer brokers happen OFF the MLS — direct broker-to-broker communication. Sellers can still pay buyer-broker compensation as a concession; just not advertised on platforms." },

  { id: "form-016", pack: "forms", front:
    "Earnest money — escrow rules and timing in NC?",
    back: "Earnest money is paid by buyer at contract execution, held in escrow by the LISTING agent's broker (or attorney). Cannot be released without both parties' consent OR a court order. If contract terminates: dispute resolution per the contract; if neither party agrees, escrow holder files an interpleader. Money sits until resolved." },

  { id: "form-017", pack: "forms", front:
    "HOA section of the NCRPOADS — what must the seller answer?",
    back: "Whether the property is subject to an Owners' Association. If yes: HOA name, governing documents, current dues amount, transfer fees, planned/pending special assessments. Seller signs and certifies accuracy. Misrepresentation here is the most common NCREC complaint for HOA-property transactions." },

  { id: "form-018", pack: "forms", front:
    "Square footage disclosure — when does ANSI Z765 actually apply on the MLS?",
    back: "Canopy MLS requires ANSI Z765-2021 compliance when square footage IS reported. Agents can list a property without reporting square footage (rare), but if reported, the number must follow ANSI: outside walls, no below-grade GLA, ceiling-height minimums, etc. Tax-record SF is not ANSI-compliant and shouldn't be used." },

  // ─── CMA deepening (+5 to reach 18) ──────────────────────────────────
  { id: "cma-014", pack: "cma", front:
    "Comp selection criteria — what makes a comp 'good' for a WNC mountain home?",
    back: "Sold within last 6 months (3 in hot markets). Within 1 mile, same elevation band, similar acreage, same view category, same construction type (log vs stick). Adjustments needed for: GLA, lot size, view quality, age, condition. Avoid using comps in different micro-markets — Highlands vs Franklin are different markets." },

  { id: "cma-015", pack: "cma", front:
    "Typical CMA adjustment dollars for common features in WNC?",
    back: "Bedroom: $10–20K each. Bathroom: $5–10K. Garage bay: $8–15K. Acre of land beyond first: $5–15K depending on usability. Long-range view: $50K–$200K (non-linear). Updated kitchen: $15–40K. Adjustments are art + market data; document your sources in the CMA narrative." },

  { id: "cma-016", pack: "cma", front:
    "FHA seller concession cap — what's the rule and why does it matter?",
    back: "FHA limits seller concessions to 6% of sale price (closing costs, prepaids, points). Above 6% triggers a dollar-for-dollar reduction in the sale price for appraisal purposes. Listing agent: don't agree to 8% in concessions on FHA buyer without understanding the appraisal impact." },

  { id: "cma-017", pack: "cma", front:
    "Conventional loan seller concessions — what's the limit?",
    back: "Conventional caps depend on the loan's down payment: 3% for primary residence with <10% down, 6% for 10–25% down, 9% for >25% down. Investor loans: 2% cap. Stricter than FHA in low-down-payment scenarios. Verify the buyer's loan type before agreeing to a concession amount." },

  { id: "cma-018", pack: "cma", front:
    "Days-on-market signal — what does an extending DOM tell you about price?",
    back: "DOM grows past the area median (60–90 days in WNC) = the market is rejecting the price. Strong listings typically pend by day 14–30. By day 45+ without showings = pricing is the cause. By day 60+ with showings but no offers = either pricing OR a hidden objection (smell, weird floor plan, deferred maintenance). Investigate before dropping." },
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
