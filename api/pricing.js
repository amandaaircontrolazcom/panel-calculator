// GET /api/pricing — fetch all pricing config
// POST /api/pricing — admin updates (requires X-Passcode header)

const { listRecords, createRecord, updateRecord } = require('./_airtable');

const BRAND_MAP = {
  'Siemens': 'siemens',
  'Eaton BR': 'eaton-br',
  'Square D Homeline': 'sqd-homeline',
};

const TYPE_MAP = {
  'Single-pole': 'single',
  'Tandem': 'tandem',
  'Double-pole': 'double',
  'GFCI': 'gfci',
  'AFCI': 'afci',
  'Dual-function': 'df',
};

const GLOBALS_MAP = {
  'Labor Rate': 'labor-rate',
  'Base Hours': 'labor-base',
  'Material Markup %': 'markup-mat',
  'Labor Markup %': 'markup-labor',
  'Misc Materials %': 'm-misc-pct',
  'Target Margin %': 'margin-target',
  'Critical Margin %': 'margin-critical',
  'Meter Base Cost': 'm-meter-cost',
  'Service Mast Cost': 'm-mast-cost',
  'Surge Protector Cost': 'm-surge-cost',
  'Interlock Kit Cost': 'm-interlock-cost',
  'Drywall Patch Cost': 'm-drywall-cost',
  'Stucco Patch Cost': 'm-stucco-cost',
  'SE Cable Rate': 'm-se-rate',
  'Ground Rod Cost': 'm-ground-cost',
  'Permit Default': 'permit-fee',
  'Adj Mast Replace Hours': 'a-mast-hrs',
  'Adj Long SE Hours': 'a-longrun-hrs',
  'Adj Tight Space Hours': 'a-tight-hrs',
  'Adj Other Hours': 'a-other-hrs',
  'Adj Semi-Flush Mount Hours': 'a-semiflush-hrs',
  'Adj Pole Mount Hours': 'a-pole-hrs',
};

async function loadAll() {
  const [panels, breakers, globals] = await Promise.all([
    listRecords('Pricing - Panels'),
    listRecords('Pricing - Breakers'),
    listRecords('Pricing - Globals'),
  ]);

  const panelMap = {};
  panels.forEach(r => {
    const brand = BRAND_MAP[r.fields.Brand];
    const amp = r.fields.Amperage;
    const cost = r.fields.Cost;
    if (brand && amp && cost != null) {
      panelMap[`${brand}-${amp}`] = cost;
    }
  });

  const breakerMap = {};
  breakers.forEach(r => {
    const brand = BRAND_MAP[r.fields.Brand];
    const type = TYPE_MAP[r.fields.Type];
    const cost = r.fields.Cost;
    if (brand && type && cost != null) {
      breakerMap[`${brand}-${type}`] = cost;
    }
  });

  const globalsMap = {};
  if (globals.length > 0) {
    const g = globals[0];
    Object.entries(GLOBALS_MAP)
