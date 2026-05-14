// FieldReady seed deck v0.1
// 78 hand-curated cards extracted from the WNC listing-agent research dossier.
// Topics: NC septic, wells, mountain foundations, log homes, older home systems,
// roofing & HVAC, NC listing forms, CMA & net sheet, post-Helene & insurance,
// and the "ego question" walkthrough patterns.

export const SEED_CARDS = [
  // ─── NC Septic (12) ─────────────────────────────────────────────────────
  { id: "septic-001", pack: "septic", front: "When did NC's biggest septic rule overhaul in 34 years take effect?", back: "January 1, 2024 (15A NCAC 18E)." },
  { id: "septic-002", pack: "septic", front: "What's the three-permit sequence for NC septic systems?", back: "Improvement Permit (IP) → Construction Authorization (CA) → Operation Permit (OP). The IP is valid for 5 years." },
  { id: "septic-003", pack: "septic", front: "Why don't NC septic permits use perc tests?", back: "NC uses soil morphology evaluation — a soil scientist evaluates the soil profile, not water absorption rate. Unlike most other states." },
  { id: "septic-004", pack: "septic", front: "A buyer asks: 'Is this really a 4-bedroom?' What's your protocol?", back: "Pull the septic permit. Bedroom count is permit-tied (2 persons/bedroom). Advertising more bedrooms than the permit allows is a willful misrepresentation under NCREC — top discipline trigger." },
  { id: "septic-005", pack: "septic", front: "Where do you pull a Macon County septic permit?", back: "Macon County Public Health, environmental health — via maconnc.org. Never rely on the tax card alone." },
  { id: "septic-006", pack: "septic", front: "What's an LPP system and why is it common in WNC?", back: "Low-pressure pipe — pumped distribution. Common on mountain slopes where gravity-fed gravel trenches won't work due to slope, bedrock, or thin soil." },
  { id: "septic-007", pack: "septic", front: "What slope range usually requires engineering for septic in NC?", back: "Slopes over 15% are classified Provisionally Suitable. Over 30% generally requires an engineered design." },
  { id: "septic-008", pack: "septic", front: "Who can legally install septic in NC?", back: "NCOWCICB-certified installers (Grade I/II/III). The installer's grade should appear on the permit." },
  { id: "septic-009", pack: "septic", front: "A seller mentions sharing a drainfield with the neighbor. What does that imply?", back: "Combination or community system — drainfield may be HOA- or jointly-owned. Recorded agreement required; flag as a disclosure item." },
  { id: "septic-010", pack: "septic", front: "Name three NC septic system types common in WNC.", back: "Conventional gravity, low-pressure pipe (LPP), drip irrigation, advanced pretreatment — any three." },
  { id: "septic-011", pack: "septic", front: "What's the most-litigated septic error on listings?", back: "Advertising more bedrooms than the septic permit allows. Top NCREC discipline trigger." },
  { id: "septic-012", pack: "septic", front: "How long is a NC Improvement Permit valid?", back: "5 years." },

  // ─── Wells & Water (8) ──────────────────────────────────────────────────
  { id: "well-001", pack: "wells", front: "Drilled vs. dug well — the quickest visual tell?", back: "Drilled: 4–6\" steel or PVC casing sticking up. Dug: large diameter (often 24\"+), shallow, frequently pre-1970 and prone to contamination." },
  { id: "well-002", pack: "wells", front: "What's the typical lender minimum GPM threshold?", back: "FHA/VA typically want 3–5 GPM sustained. Aim for 5+ for resale comfort." },
  { id: "well-003", pack: "wells", front: "Shared well in NC — what document is required?", back: "A recorded shared-well agreement. It's a disclosure item on the NCRPOADS, and a frequent closing-week crisis when missing." },
  { id: "well-004", pack: "wells", front: "Are spring boxes lender-acceptable as primary water?", back: "Generally no. Most lenders won't accept a spring as primary potable supply. Flag immediately." },
  { id: "well-005", pack: "wells", front: "Three water tests required by FHA/VA?", back: "Bacteria, nitrates, nitrites. Lead too, on older systems." },
  { id: "well-006", pack: "wells", front: "What's a pitless adapter?", back: "The fitting that takes the well line below frost line and into the home. Eliminates the old above-ground well house." },
  { id: "well-007", pack: "wells", front: "Submersible vs. jet pump — which is more common in WNC mountain wells?", back: "Submersible. Jets are for shallow wells or older systems." },
  { id: "well-008", pack: "wells", front: "Typical mountain well depth range?", back: "100–600+ feet in WNC bedrock." },

  // ─── Mountain Foundations (6) ───────────────────────────────────────────
  { id: "found-001", pack: "foundations", front: "What's the NC code rule for grade fall away from foundation?", back: "6 inches of fall in the first 10 feet. WNC properties often have grade running toward the house — a major Helene-era lesson." },
  { id: "found-002", pack: "foundations", front: "Three signs of foundation settlement?", back: "Stair-step cracks in masonry, doors out of square, sloping floors — use a marble to test." },
  { id: "found-003", pack: "foundations", front: "How many landslides did USGS catalog across WNC post-Helene?", back: "Over 2,200." },
  { id: "found-004", pack: "foundations", front: "Where do you pull a landslide hazard map for a WNC parcel?", back: "NC Geological Survey publishes them. Pull one for every listing in a susceptible county." },
  { id: "found-005", pack: "foundations", front: "Buncombe, Yancey, McDowell, Avery — what do these counties share?", back: "Worst-hit by Helene landslides. Macon is in the same susceptibility band but was less directly devastated." },
  { id: "found-006", pack: "foundations", front: "Buyer flags a sump pump in a daylight basement — confident reply?", back: "\"Standard for slope lots in WNC. Daylight basements collect runoff; a sump is normal, not a red flag.\"" },

  // ─── Log Homes (10) ─────────────────────────────────────────────────────
  { id: "log-001", pack: "logs", front: "What's the #1 inspection red flag on a log home?", back: "Rot at the base course (lowest log) and at log ends under short eaves." },
  { id: "log-002", pack: "logs", front: "How do you check for log rot in the field?", back: "Tap with a screwdriver or mallet. Hollow sound means decay." },
  { id: "log-003", pack: "logs", front: "Is checking (lengthwise cracks in logs) a problem?", back: "Normal — unless cracks face upward and can collect water." },
  { id: "log-004", pack: "logs", front: "Lifespan of flexible synthetic chinking?", back: "About 20–25 years. Traditional mortar chinking cracks faster." },
  { id: "log-005", pack: "logs", front: "Three pests to look for on a log home?", back: "Carpenter bees, powder-post beetles, termites. Look for pinhole holes and frass (sawdust piles)." },
  { id: "log-006", pack: "logs", front: "Typical log stain re-coat cycle?", back: "Every 3–5 years. Failed stain = water no longer beads; gray UV damage on south/west walls." },
  { id: "log-007", pack: "logs", front: "Log home R-value vs. stick-built — honest answer?", back: "Logs are roughly R-8 vs. R-14+ stick-built. The thermal mass argument is honest; the raw R-value argument isn't." },
  { id: "log-008", pack: "logs", front: "Why do older log home windows stick?", back: "Older logs settle 3–6 inches. Window/door frames need slip joints. Stuck windows often mean a missing slip joint." },
  { id: "log-009", pack: "logs", front: "Minimum overhang on a log home?", back: "24 inches minimum; 36+ inches on a two-story. Short eaves = future rot, period." },
  { id: "log-010", pack: "logs", front: "Buyer's husband says 'but logs are so insulating.' Confident reply?", back: "\"The thermal mass argument is real — logs hold and release heat slowly. R-value alone is closer to R-8, below stick-built. They perform differently, not necessarily worse.\"" },

  // ─── Older Home Systems (12) ────────────────────────────────────────────
  { id: "older-001", pack: "older", front: "What does a Federal Pacific Stab-Lok panel look like?", back: "Orange \"FPE\" or \"Federal Pacific Electric\" stamp. Breakers can fail to trip. Fire risk and often uninsurable." },
  { id: "older-002", pack: "older", front: "Buyer asks: 'Is that a Federal Pacific panel?' Confident reply?", back: "\"Yeah — that's FPE, a known insurance issue. Budget $2–4K for replacement; I always flag these up front.\"" },
  { id: "older-003", pack: "older", front: "Zinsco panels — what's the story?", back: "Similar to FPE — breakers fail to trip; insurance and fire risk. Less distinctive visually but same remediation." },
  { id: "older-004", pack: "older", front: "Aluminum branch wiring — what years are risky?", back: "Roughly 1965–1975. The 15A/20A branch wiring is the fire risk; service-entrance aluminum is fine. Look for \"AL\" stamp on the jacket." },
  { id: "older-005", pack: "older", front: "How is aluminum branch wiring remediated?", back: "CO/ALR-rated outlets, or pigtailed with COPALUM or AlumiConn connectors." },
  { id: "older-006", pack: "older", front: "Polybutylene plumbing — what years, what does it look like?", back: "1978–1995. Gray plastic supply pipe with copper or brass crimp fittings. Widely known to fail; major insurance issue. Pulled from market 1996." },
  { id: "older-007", pack: "older", front: "Pre-1940s knob-and-tube wiring — main listing concern?", back: "Insurability. Many carriers won't write a policy on it." },
  { id: "older-008", pack: "older", front: "Pre-1978 home — what federal disclosure kicks in?", back: "Lead-based paint disclosure (federal, EPA-mandated)." },
  { id: "older-009", pack: "older", front: "Vermiculite attic insulation (Zonolite) — the concern?", back: "Asbestos-contaminated. Don't disturb; disclose. Same era as 9×9 floor tile, pre-1980 popcorn ceilings, and transite siding." },
  { id: "older-010", pack: "older", front: "Galvanized supply pipe — lifespan?", back: "About 50 years. Rusty interior, low flow. Pre-1960 homes most often." },
  { id: "older-011", pack: "older", front: "Asphalt shingle lifespans at WNC altitude?", back: "3-tab: ~15–20 years. Architectural: ~25–30 years. UV is harsher at altitude." },
  { id: "older-012", pack: "older", front: "Standing-seam metal roof — lifespan and what to watch?", back: "40–70 year life. Watch for fastener back-out on exposed-fastener (5-V crimp) installs." },

  // ─── HVAC (5) ───────────────────────────────────────────────────────────
  { id: "hvac-001", pack: "hvac", front: "At what temperature do heat pumps lose efficiency?", back: "Below about 25°F. Many WNC homes have dual-fuel: heat pump plus propane or electric strip backup." },
  { id: "hvac-002", pack: "hvac", front: "Owned vs. leased propane tank — why does it matter?", back: "Owned transfers in the sale. Leased requires lessor coordination (Suburban, Ferrellgas, Blossman common in WNC). Big deal point." },
  { id: "hvac-003", pack: "hvac", front: "Typical residential propane tank sizes in WNC?", back: "500-gallon is typical; 1,000-gallon for whole-home heat." },
  { id: "hvac-004", pack: "hvac", front: "EPA-certified wood stove — why does it matter for insurance?", back: "Non-certified stoves (pre-1988) are an insurance issue. EPA-certified post-1988, or newer post-2020 standards." },
  { id: "hvac-005", pack: "hvac", front: "Class A insulated chimney vs. masonry — quick distinction?", back: "Class A is factory-built insulated stainless flue (typical for stoves and zero-clearance fireplaces). Masonry is brick/stone with a clay or stainless liner." },

  // ─── NC Listing Forms & MLS (10) ────────────────────────────────────────
  { id: "form-001", pack: "forms", front: "What does NCRPOADS stand for, and when must it be delivered?", back: "NC Residential Property and Owners' Association Disclosure Statement (Form REC 4.22). Must be delivered to the buyer BEFORE the offer is signed." },
  { id: "form-002", pack: "forms", front: "Can an agent fill out the NCRPOADS for a seller?", back: "No — forbidden. Seller fills it out. Agent can answer questions but cannot complete it for them." },
  { id: "form-003", pack: "forms", front: "Second mandatory NC disclosure beyond NCRPOADS?", back: "Mineral and Oil and Gas Rights Mandatory Disclosure Statement. Required on every residential sale — often forgotten." },
  { id: "form-004", pack: "forms", front: "When is the Working with Real Estate Agents disclosure delivered?", back: "First substantial contact with the buyer or seller." },
  { id: "form-005", pack: "forms", front: "ANSI Z765-2021 — what's the biggest WNC gotcha?", back: "Below-grade finished area is NOT GLA. Walkout basements report separately. Measure from outside walls." },
  { id: "form-006", pack: "forms", front: "ANSI minimum ceiling height?", back: "7 feet (with sloped-ceiling carve-outs). Nothing under 5 feet counts." },
  { id: "form-007", pack: "forms", front: "Can you use tax records for square footage on the MLS?", back: "No. NCREC explicitly forbids relying on tax records, prior MLS, prior appraisals, or seller representation. Broker must measure or hire a measurer." },
  { id: "form-008", pack: "forms", front: "Name three Fair Housing trigger phrases to scrub from listing remarks.", back: "\"Walking distance,\" \"family neighborhood,\" \"great for retirees,\" \"exclusive,\" \"private,\" \"safe\" — all challengeable." },
  { id: "form-009", pack: "forms", front: "Drone photographer requirement?", back: "Part 107 licensed pilot. Verify before hiring. Common WNC oversight." },
  { id: "form-010", pack: "forms", front: "Land listing — three things you never promise without documentation?", back: "\"Buildable,\" \"perked,\" \"no flooding,\" or specific GPM. Top-litigation phrases." },

  // ─── CMA & Net Sheet (8) ────────────────────────────────────────────────
  { id: "cma-001", pack: "cma", front: "NC excise (revenue) tax rate, and who pays?", back: "$1 per $500 of sale price ($2 per $1,000). Seller pays." },
  { id: "cma-002", pack: "cma", front: "Does Macon County levy a county transfer tax?", back: "No. Only 7 NC counties do. Always verify per closing." },
  { id: "cma-003", pack: "cma", front: "When should you present a net sheet — at the listing appointment or with the offer?", back: "Listing appointment. Doing it later loses the trust-building moment. Most agents save it for the offer; that's backwards." },
  { id: "cma-004", pack: "cma", front: "Why is the three-pile CMA important for WNC sellers?", back: "Actives = competition. Pendings = where the market is going. Solds = where it's been. WNC sellers anchor on actives — train them to look at solds." },
  { id: "cma-005", pack: "cma", front: "NC closing — who handles it, and what does it cost?", back: "NC is an attorney-closing state. Roughly $400–$800." },
  { id: "cma-006", pack: "cma", front: "View premium impact on a WNC mountain home?", back: "Non-linear. A long-range layered ridge view at 3,500 ft can add $50K–$200K over an identical yard-view home." },
  { id: "cma-007", pack: "cma", front: "Why is 'did not flood / did not slide' status a pricing factor now?", back: "Post-Helene, properties with documented clean status command a premium. Any damage history (even repaired) trades at a discount." },
  { id: "cma-008", pack: "cma", front: "Typical termite/WDIR letter cost for the net sheet?", back: "$75–$150." },

  // ─── Post-Helene & Insurance (5) ────────────────────────────────────────
  { id: "helene-001", pack: "helene", front: "How many NC counties got FEMA Individual Assistance after Helene?", back: "39." },
  { id: "helene-002", pack: "helene", front: "First Street vs. FEMA flood maps — what do you tell a buyer?", back: "FEMA defines SFHA for insurance and permits. First Street (now on Zillow) models climate risk including pluvial flooding. Both matter; FEMA is regulatory, First Street is predictive." },
  { id: "helene-003", pack: "helene", front: "What new best practice replaced 'insurance is a closing-stage issue'?", back: "Pull a CLUE-type loss history at LISTING stage. Insurability is now a listing conversation." },
  { id: "helene-004", pack: "helene", front: "Stream-adjacent property on cut-and-fill — insurance implication?", back: "Tightened underwriting post-Helene. Likely surcharges or non-renewal risk. Ask the seller for the current declarations page early." },
  { id: "helene-005", pack: "helene", front: "Estimated statewide damages from Helene?", back: "About $59.6B; ~121,000 homes affected per NC OSBM." },

  // ─── Ego-Question Patterns (8) ──────────────────────────────────────────
  { id: "ego-001", pack: "ego", front: "Buyer asks: 'What's the age of this roof?' Confident answer pattern?", back: "Identify shingle type (\"Architectural, looks like Owens Corning\"), note granule loss state, give a range (\"my read is 8–12 years remaining\"), defer to inspector (\"inspector will confirm\")." },
  { id: "ego-002", pack: "ego", front: "Buyer asks: 'Is that load-bearing?' Confident reply?", back: "\"I'd treat it as load-bearing until a structural engineer says otherwise.\"" },
  { id: "ego-003", pack: "ego", front: "Buyer asks: 'What's the GPM on this well?' Confident reply?", back: "\"I'll request the most recent flow test from the seller. FHA wants 3–5 sustained; I aim for 5+ for resale.\"" },
  { id: "ego-004", pack: "ego", front: "Buyer asks: 'What's the R-value here?' Quick fluent answer?", back: "R-13 typical for 2×4 walls, R-19 for 2×6, R-8 for log, R-30+ in attics post-2000." },
  { id: "ego-005", pack: "ego", front: "Buyer asks: 'Is the septic gravity-fed?' Confident reply on a sloped lot?", back: "\"Pumped — see the alarm panel; it's LPP, which is standard on this slope.\"" },
  { id: "ego-006", pack: "ego", front: "Buyer asks: 'What's the easement situation?'", back: "\"Title commitment will show all of them. Here's what I see on the recorded plat...\" — then point to specifics." },
  { id: "ego-007", pack: "ego", front: "'That driveway grade looks marginal — what does a regrade cost?' What's actually happening?", back: "This is a negotiation anchor disguised as curiosity. Don't quote a number. Flag it for the inspection period and treat as a pricing move, not a quiz." },
  { id: "ego-008", pack: "ego", front: "Core principle when handed a competence-check question on a walkthrough?", back: "Fluency, not depth. Short, confident, accurate. The flinch is the trap, not the question. A confident half-answer beats a hedged full one." },
];

export const PACKS = {
  septic: { name: "NC Septic & Permits", emoji: "S" },
  wells: { name: "Wells & Water", emoji: "W" },
  foundations: { name: "Mountain Foundations", emoji: "F" },
  logs: { name: "Log Homes", emoji: "L" },
  older: { name: "Older Home Systems", emoji: "O" },
  hvac: { name: "HVAC & Propane", emoji: "H" },
  forms: { name: "NC Listing Forms & MLS", emoji: "N" },
  cma: { name: "CMA & Net Sheet", emoji: "C" },
  helene: { name: "Post-Helene & Insurance", emoji: "I" },
  ego: { name: "Walkthrough Q&A Patterns", emoji: "Q" },
};
