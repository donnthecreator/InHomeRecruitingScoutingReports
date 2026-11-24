/* =====================================================================
   program-board-flag.js
   POST { code, prospectId, isProspect }

   A high school head coach moves one of his own players between the
   Roster tab and the Prospects tab on his portal. The prospects list is
   what InHome pushes to college staffs and what the shareable PDF is
   built from.

   The code is the program's portal access code, as everywhere else on
   the portal. It only ever flips a row already on that program's own
   board, so a code can touch nothing but its own roster.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
  let b; try { b = JSON.parse(event.body || '{}'); } catch { return fail(400, 'Bad request'); }

  const program = String(b.code || b.program || '').trim().toUpperCase();
  const prospectId = parseInt(b.prospectId, 10);
  const want = !!b.isProspect;
  if (!program || !prospectId) return fail(400, 'code and prospectId required');

  try {
    await sql`ALTER TABLE program_prospects ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN NOT NULL DEFAULT false`;
    const rows = await sql`
      UPDATE program_prospects SET is_prospect = ${want}
      WHERE upper(program_code) = ${program} AND prospect_id = ${prospectId}
      RETURNING id, is_prospect`;
    if (!rows.length) return fail(404, 'That player is not on this board');
    const [c] = await sql`SELECT count(*)::int AS n FROM program_prospects
                          WHERE upper(program_code) = ${program} AND is_prospect`;
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, prospectId, isProspect: rows[0].is_prospect, prospectCount: c.n }) };
  } catch (err) {
    console.error('program-board-flag error:', err);
    return fail(500, err.message);
  }
};
