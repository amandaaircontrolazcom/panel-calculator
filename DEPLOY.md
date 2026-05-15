// POST /api/auth
// Body: { passcode: "1234" }
// Returns: { role: "admin" | "estimator" } or 401

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { passcode } = req.body || {};
    if (!passcode) {
      res.status(400).json({ error: 'Passcode required' });
      return;
    }

    const adminCode = process.env.ADMIN_PASSCODE;
    const estimatorCode = process.env.ESTIMATOR_PASSCODE;

    if (!adminCode || !estimatorCode) {
      res.status(500).json({ error: 'Server passcodes not configured' });
      return;
    }

    const input = String(passcode).trim();

    if (input === String(adminCode)) {
      res.status(200).json({ role: 'admin' });
      return;
    }
    if (input === String(estimatorCode)) {
      res.status(200).json({ role: 'estimator' });
      return;
    }

    res.status(401).json({ error: 'Invalid passcode' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
