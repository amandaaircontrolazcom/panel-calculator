// GET /api/pricing
// Returns all pricing data from Airtable as a single object:
// {
//   panels: { "siemens-200": 220, ... },
//   breakers: { "siemens-single": 8, ... },
//   globals: { laborRate: 55, ... },
//   meta: { panelRecords: [...], breakerRecords: [...], globalsRecordId }
// }
//
// POST /api/pricing
// Body: { type: "panel"|"breaker"|"global", key/id, value/fields }
// Admin-only - validates passcode header.

const { listRecords, createRecord, updateRecord } = require('./_airtable');

// Brand label -> normalized key used in the calculator
const BRAND_MAP = {
  'Siemens': 'siemens',
  'Eaton BR': 'eaton-br',
  'Square D Homeline': 'sqd-homeline',
};

// Breaker type label -> normalized key
const TYPE_MAP = {
  'Single-pole': 'single',
  'Tandem': 'tandem',
  'Double-pole': 'double',
  'GFCI': 'gfci',
  'AFCI': 'afci',
  'Dual-function': 'df',
};

// Globals: Airtable field name -> calculator field id
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
      panelMap[`${brand}-${amp}`] = { cost, recordId: r.id };
    }
  });

  const breakerMap = {};
  breakers.forEach(r => {
    const brand = BRAND_MAP[r.fields.Brand];
    const type = TYPE_MAP[r.fields.Type];
    const cost = r.fields.Cost;
    if (brand && type && cost != null) {
      breakerMap[`${brand}-${type}`] = { cost, recordId: r.id };
    }
  });

  const globalsMap = {};
  let globalsRecordId = null;
  if (globals.length > 0) {
    const g = globals[0];
    globalsRecordId = g.id;
    Object.entries(GLOBALS_MAP).forEach(([airtableField, calcField]) => {
      const val = g.fields[airtableField];
      if (val != null) globalsMap[calcField] = val;
    });
  }

  return {
    panels: Object.fromEntries(Object.entries(panelMap).map(([k, v]) => [k, v.cost])),
    breakers: Object.fromEntries(Object.entries(breakerMap).map(([k, v]) => [k, v.cost])),
    globals: globalsMap,
    meta: {
      panelRecordsByKey: Object.fromEntries(Object.entries(panelMap).map(([k, v]) => [k, v.recordId])),
      breakerRecordsByKey: Object.fromEntries(Object.entries(breakerMap).map(([k, v]) => [k, v.recordId])),
      globalsRecordId,
    },
  };
}

// Reverse maps for writing
const BRAND_REV = Object.fromEntries(Object.entries(BRAND_MAP).map(([a, b]) => [b, a]));
const TYPE_REV = Object.fromEntries(Object.entries(TYPE_MAP).map(([a, b]) => [b, a]));
const GLOBALS_REV = Object.fromEntries(Object.entries(GLOBALS_MAP).map(([a, b]) => [b, a]));

async function isAdmin(req) {
  const passcode = req.headers['x-passcode'];
  return passcode && String(passcode) === String(process.env.ADMIN_PASSCODE);
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const data = await loadAll();
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      if (!(await isAdmin(req))) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { type, key, value } = req.body || {};

      if (type === 'panel') {
        // key is like "siemens-200"
        const [brandKey, amp] = key.split('-').reduce((acc, _, i, arr) => {
          if (i === arr.length - 1) acc.push(arr[i]);
          else acc[0] = (acc[0] || '') + (i === 0 ? '' : '-') + arr[i];
          return acc;
        }, []);
        // Simpler parse: brand may contain dashes (sqd-homeline). Last segment is amp.
        const lastDash = key.lastIndexOf('-');
        const brand = key.substring(0, lastDash);
        const ampVal = key.substring(lastDash + 1);
        const brandLabel = BRAND_REV[brand];
        if (!brandLabel) {
          res.status(400).json({ error: 'Unknown brand: ' + brand });
          return;
        }

        const existing = await listRecords('Pricing - Panels', {
          filterByFormula: `AND({Brand}='${brandLabel}', {Amperage}='${ampVal}')`,
        });

        if (existing.length > 0) {
          await updateRecord('Pricing - Panels', existing[0].id, { Cost: parseFloat(value) });
        } else {
          await createRecord('Pricing - Panels', {
            Brand: brandLabel,
            Amperage: ampVal,
            Cost: parseFloat(value),
          });
        }
        res.status(200).json({ ok: true });
        return;
      }

      if (type === 'breaker') {
        // key is like "siemens-single"
        const lastDash = key.lastIndexOf('-');
        const brand = key.substring(0, lastDash);
        const typeKey = key.substring(lastDash + 1);
        const brandLabel = BRAND_REV[brand];
        const typeLabel = TYPE_REV[typeKey];
        if (!brandLabel || !typeLabel) {
          res.status(400).json({ error: 'Unknown brand or type' });
          return;
        }

        const existing = await listRecords('Pricing - Breakers', {
          filterByFormula: `AND({Brand}='${brandLabel}', {Type}='${typeLabel}')`,
        });

        if (existing.length > 0) {
          await updateRecord('Pricing - Breakers', existing[0].id, { Cost: parseFloat(value) });
        } else {
          await createRecord('Pricing - Breakers', {
            Brand: brandLabel,
            Type: typeLabel,
            Cost: parseFloat(value),
          });
        }
        res.status(200).json({ ok: true });
        return;
      }

      if (type === 'global') {
        // value is an object of { calcFieldId: value }
        const fields = {};
        Object.entries(value || {}).forEach(([calcField, val]) => {
          const airtableField = GLOBALS_REV[calcField];
          if (airtableField) fields[airtableField] = parseFloat(val);
        });
        if (Object.keys(fields).length === 0) {
          res.status(400).json({ error: 'No valid global fields provided' });
          return;
        }

        const globals = await listRecords('Pricing - Globals');
        if (globals.length > 0) {
          await updateRecord('Pricing - Globals', globals[0].id, fields);
        } else {
          await createRecord('Pricing - Globals', { 'Setting Name': 'Active Config', ...fields });
        }
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: 'Unknown update type: ' + type });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Pricing error:', err);
    res.status(500).json({ error: err.message });
  }
};
