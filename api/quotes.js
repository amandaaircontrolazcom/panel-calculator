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
