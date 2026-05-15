// POST /api/quotes
// Body: full quote object from the calculator.
// Saves to Airtable "Quotes" table.

const { createRecord } = require('./_airtable');

const JOB_LABELS = {
  'swap': 'Panel Replacement',
  'upgrade': 'Service Upgrade',
  'subpanel': 'Subpanel Add',
  'gen': 'Generator-Ready Pkg',
};

const MOUNT_LABELS = {
  'surface': 'Surface',
  'semi-flush': 'Semi-Flush',
  'pole': 'Pole',
};

const LOCATION_LABELS = {
  'indoor': 'Indoor',
  'outdoor': 'Outdoor',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const passcode = req.headers['x-passcode'];
    if (!passcode) {
      res.status(403).json({ error: 'Passcode required' });
      return;
    }
    const valid =
      String(passcode) === String(process.env.ADMIN_PASSCODE) ||
      String(passcode) === String(process.env.ESTIMATOR_PASSCODE);
    if (!valid) {
      res.status(403).json({ error: 'Invalid passcode' });
      return;
    }

    const isAdmin = String(passcode) === String(process.env.ADMIN_PASSCODE);
    const q = req.body || {};

    const fields = {
      'Estimator': q.estimator || 'Unknown',
      'Reference': q.reference || '',
      'Job Type': JOB_LABELS[q.jobType] || q.jobType || '',
      'Panel Summary': q.panelSummary || '',
      'Panel SKU': q.panelSKU || '',
      'Mount Type': MOUNT_LABELS[q.mountType] || '',
      'Location': LOCATION_LABELS[q.location] || '',
      'Total Price': Number(q.totalPrice) || 0,
      'Hours': Number(q.hours) || 0,
      'Breaker Count': Number(q.breakerCount) || 0,
      'Details JSON': q.detailsJSON || '',
    };

    // Only save cost/margin/profit if the user is admin
    if (isAdmin) {
      fields['Material Cost'] = Number(q.materialCost) || 0;
      fields['Labor Cost'] = Number(q.laborCost) || 0;
      fields['Profit'] = Number(q.profit) || 0;
      fields['Margin %'] = Number(q.margin) || 0;
    }

    const result = await createRecord('Quotes', fields);
    res.status(200).json({ ok: true, id: result.id });
  } catch (err) {
    console.error('Quote save error:', err);
    res.status(500).json({ error: err.message });
  }
};
