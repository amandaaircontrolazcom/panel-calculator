// Shared Airtable client used by all API routes.
// Reads AIRTABLE_TOKEN and AIRTABLE_BASE_ID from Vercel env vars.

const BASE_URL = 'https://api.airtable.com/v0';

function getCreds() {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!token || !baseId) {
    throw new Error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID env vars');
  }
  return { token, baseId };
}

async function airtableFetch(path, options = {}) {
  const { token, baseId } = getCreds();
  const url = `${BASE_URL}/${baseId}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

async function listRecords(tableName, params = {}) {
  const encoded = encodeURIComponent(tableName);
  const query = new URLSearchParams(params).toString();
  const path = `${encoded}${query ? '?' + query : ''}`;
  const data = await airtableFetch(path);
  return data.records || [];
}

async function createRecord(tableName, fields) {
  const encoded = encodeURIComponent(tableName);
  return airtableFetch(encoded, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
}

async function updateRecord(tableName, recordId, fields) {
  const encoded = encodeURIComponent(tableName);
  return airtableFetch(`${encoded}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

module.exports = { listRecords, createRecord, updateRecord };
