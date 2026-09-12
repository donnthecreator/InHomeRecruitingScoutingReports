/* School logo library. One blob per school, keyed by a normalized school
   key so "Itawamba CC", "No. 13 Itawamba CC" and "Itawamba Community
   College" share a logo. Uploaded through photo-tool (admin), served by
   frame.js like any other image. */
const schoolKey = (s) => String(s || '').toLowerCase()
  .replace(/^no\.?\s*\d+\s*/, '')
  .replace(/community college/g, 'cc').replace(/junior college/g, 'jc')
  .replace(/high school/g, 'hs')
  .replace(/[^a-z0-9]/g, '');

async function ensureTable(sql) {
  await sql`CREATE TABLE IF NOT EXISTS school_logos (
    school_key TEXT PRIMARY KEY,
    display_name TEXT,
    blob_key TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

/* { schoolKey -> absolute frame url } */
async function logoMap(sql, base) {
  try {
    const rows = await sql`SELECT school_key, blob_key FROM school_logos`;
    const m = {};
    rows.forEach(r => { m[r.school_key] = `${base}/.netlify/functions/frame?key=${encodeURIComponent(r.blob_key)}`; });
    return m;
  } catch (e) { return {}; }
}

module.exports = { schoolKey, ensureTable, logoMap };
