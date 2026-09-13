/* =====================================================================
   scout-board.js
   A scout's Big Board: HIS ordered list per position and class. Entries
   can be scouted or unscouted; the order is his call, the grade shown
   next to a player is whatever the scouts collectively gave him.

     GET  ?accessCode=..                 -> all boards for this scout
     POST { accessCode, action:'save', position, classYear, entries:[{key,name,school,prospectId}] }
     POST { accessCode, action:'addPlayer', name, school, position, classYear } -> find-or-create prospect

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });
const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

async function ensure() {
  await sql`CREATE TABLE IF NOT EXISTS scout_boards (
    scout_id TEXT NOT NULL, position TEXT NOT NULL, class_year TEXT NOT NULL,
    entries JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (scout_id, position, class_year))`;
}
async function scoutFor(code) {
  if (!code) return null;
  const rows = await sql`SELECT scout_id, name FROM scouts WHERE upper(access_code) = ${String(code).trim().toUpperCase()} LIMIT 1`;
  return rows[0] || null;
}

exports.handler = async (event) => {
  try {
    await ensure();
    if (event.httpMethod === 'GET') {
      const scout = await scoutFor((event.queryStringParameters || {}).accessCode);
      if (!scout) return fail(401, 'Invalid access code');
      const rows = await sql`SELECT position, class_year, entries FROM scout_boards WHERE scout_id = ${scout.scout_id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ boards: rows.map(r => ({ position: r.position, classYear: r.class_year, entries: r.entries || [] })) }) };
    }
    if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
    const b = JSON.parse(event.body || '{}');
    const scout = await scoutFor(b.accessCode);
    if (!scout) return fail(401, 'Invalid access code');

    if (b.action === 'addPlayer') {
      const name = String(b.name || '').trim(); if (name.length < 3) return fail(400, 'Player name required');
      const school = b.school ? String(b.school).trim() : null;
      const nk = nameKey(name);
      let [p] = await sql`SELECT id, name, school, position, class_year FROM prospects WHERE name_key = ${nk} AND COALESCE(school,'') = ${school || ''} LIMIT 1`;
      if (!p) {
        const rows = await sql`INSERT INTO prospects (name, name_key, school, position, class_year, level)
          VALUES (${name}, ${nk}, ${school}, ${b.position || null}, ${b.classYear && b.classYear !== '—' ? String(b.classYear) : null}, 'HS')
          ON CONFLICT (name_key, COALESCE(school,''), COALESCE(class_year,'')) DO UPDATE SET updated_at = now() RETURNING id, name, school, position, class_year`;
        p = rows[0];
      }
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ prospect: { id: p.id, name: p.name, school: p.school, position: p.position, classYear: p.class_year } }) };
    }

    const position = String(b.position || '').toUpperCase().slice(0, 8);
    const classYear = String(b.classYear || '—').slice(0, 12);
    if (!position) return fail(400, 'position required');
    const entries = Array.isArray(b.entries) ? b.entries.slice(0, 300).map(e => ({
      key: String(e.key || '').slice(0, 200), name: String(e.name || '').slice(0, 120), school: e.school ? String(e.school).slice(0, 160) : null,
      prospectId: e.prospectId ? parseInt(e.prospectId, 10) : null, hidden: !!e.hidden
    })).filter(e => e.key) : [];
    await sql`INSERT INTO scout_boards (scout_id, position, class_year, entries, updated_at) VALUES (${scout.scout_id}, ${position}, ${classYear}, ${JSON.stringify(entries)}, now())
              ON CONFLICT (scout_id, position, class_year) DO UPDATE SET entries = EXCLUDED.entries, updated_at = now()`;
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ saved: entries.length }) };
  } catch (err) {
    console.error('scout-board error:', err);
    return fail(500, err.message);
  }
};
