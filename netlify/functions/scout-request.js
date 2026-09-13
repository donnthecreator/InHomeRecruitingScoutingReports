/* =====================================================================
   scout-request.js
   A scout asks to be connected with a college. Nothing goes to the
   school. It lands in admin as pending; Don approves and makes the
   introduction himself. The scout sees the status on his dashboard.

     POST { accessCode, program, prospect?, reason }   create
     GET  ?accessCode=...                               my requests

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });

async function ensure() {
  await sql`CREATE TABLE IF NOT EXISTS scout_requests (
    id SERIAL PRIMARY KEY, scout_id TEXT NOT NULL, scout_name TEXT, program TEXT NOT NULL, prospect TEXT, reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
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
      const rows = await sql`SELECT id, program, prospect, reason, status, admin_note, to_char(created_at,'YYYY-MM-DD') AS created_day
                             FROM scout_requests WHERE scout_id = ${scout.scout_id} ORDER BY created_at DESC LIMIT 50`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ requests: rows }) };
    }
    if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
    const b = JSON.parse(event.body || '{}');
    const scout = await scoutFor(b.accessCode);
    if (!scout) return fail(401, 'Invalid access code');
    const program = String(b.program || '').trim().slice(0, 120);
    if (!program) return fail(400, 'Pick a program');
    const reason = String(b.reason || '').trim().slice(0, 1500);
    if (reason.length < 15) return fail(400, 'Tell us why in a sentence or two');
    const [dup] = await sql`SELECT id FROM scout_requests WHERE scout_id = ${scout.scout_id} AND lower(program) = ${program.toLowerCase()} AND status = 'pending' LIMIT 1`;
    if (dup) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, id: dup.id, duplicate: true }) };
    const [row] = await sql`INSERT INTO scout_requests (scout_id, scout_name, program, prospect, reason)
                            VALUES (${scout.scout_id}, ${scout.name || null}, ${program}, ${b.prospect ? String(b.prospect).slice(0, 120) : null}, ${reason}) RETURNING id`;
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, id: row.id }) };
  } catch (err) {
    console.error('scout-request error:', err);
    return fail(500, err.message);
  }
};
