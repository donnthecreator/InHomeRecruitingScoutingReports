/* =====================================================================
   report-draft.js
   Partial reports. A scout can save where he is and come back; nothing
   posts to the platform until he submits the finished report.

     GET  ?accessCode=..                  -> his drafts (summaries)
     GET  ?accessCode=..&id=..            -> one draft with its payload
     POST { accessCode, action:'save', id?, payload }   -> upsert, returns id
     POST { accessCode, action:'delete', id }

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json' };
const fail = (c, m) => ({ statusCode: c, headers: HEADERS, body: JSON.stringify({ error: m }) });

async function ensure() {
  await sql`CREATE TABLE IF NOT EXISTS report_drafts (
    id SERIAL PRIMARY KEY, scout_id TEXT NOT NULL, prospect_name TEXT, school TEXT, position TEXT, class_year TEXT,
    report_id INTEGER, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
}
async function scoutFor(code) {
  if (!code) return null;
  const rows = await sql`SELECT scout_id, name FROM scouts WHERE upper(access_code) = ${String(code).trim().toUpperCase()} LIMIT 1`;
  return rows[0] || null;
}
function progress(p) {
  const raw = (p && p.raw) || {};
  const parts = [
    !!(p && p.prospect), !!(p && p.school), !!(p && p.archetype),
    Object.keys(raw.traitGrades || {}).length > 0, Object.keys(raw.athleticGrades || {}).length > 0,
    Object.keys(raw.gates || {}).length > 0, !!(p && p.recommendationTier), !!(p && (p.narrative || Object.keys(raw.prompts || {}).length))
  ];
  return Math.round(parts.filter(Boolean).length / parts.length * 100);
}

exports.handler = async (event) => {
  try {
    await ensure();
    const qs = event.queryStringParameters || {};
    if (event.httpMethod === 'GET') {
      const scout = await scoutFor(qs.accessCode);
      if (!scout) return fail(401, 'Invalid access code');
      if (qs.id) {
        const [d] = await sql`SELECT * FROM report_drafts WHERE id = ${parseInt(qs.id, 10)} AND scout_id = ${scout.scout_id}`;
        if (!d) return fail(404, 'Draft not found');
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ draft: { id: d.id, payload: d.payload, reportId: d.report_id, updatedAt: d.updated_at } }) };
      }
      const rows = await sql`SELECT id, prospect_name, school, position, class_year, report_id, payload, to_char(updated_at,'YYYY-MM-DD') AS updated_day
                             FROM report_drafts WHERE scout_id = ${scout.scout_id} ORDER BY updated_at DESC LIMIT 100`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ drafts: rows.map(d => ({ id: d.id, prospect: d.prospect_name, school: d.school, position: d.position, classYear: d.class_year, reportId: d.report_id, updated: d.updated_day, progress: progress(d.payload) })) }) };
    }
    if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
    const b = JSON.parse(event.body || '{}');
    const scout = await scoutFor(b.accessCode);
    if (!scout) return fail(401, 'Invalid access code');

    if (b.action === 'delete') {
      const id = parseInt(b.id, 10); if (!id) return fail(400, 'id required');
      await sql`DELETE FROM report_drafts WHERE id = ${id} AND scout_id = ${scout.scout_id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ deleted: id }) };
    }
    const p = (b.payload && typeof b.payload === 'object') ? b.payload : {};
    const name = String(p.prospect || '').trim().slice(0, 120);
    if (!name) return fail(400, 'Add the player\u2019s name before saving a draft');
    const meta = { school: p.school ? String(p.school).slice(0, 160) : null, position: p.position || null, classYear: p.classYear ? String(p.classYear).slice(0, 12) : null, reportId: p.reportId ? parseInt(p.reportId, 10) : null };
    const id = b.id ? parseInt(b.id, 10) : null;
    if (id) {
      const rows = await sql`UPDATE report_drafts SET prospect_name = ${name}, school = ${meta.school}, position = ${meta.position}, class_year = ${meta.classYear},
        report_id = ${meta.reportId}, payload = ${JSON.stringify(p)}, updated_at = now() WHERE id = ${id} AND scout_id = ${scout.scout_id} RETURNING id`;
      if (rows.length) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ id, progress: progress(p) }) };
    }
    /* one draft per scout + player + position; a second save on the same kid updates it */
    const [existing] = await sql`SELECT id FROM report_drafts WHERE scout_id = ${scout.scout_id} AND lower(prospect_name) = ${name.toLowerCase()} AND COALESCE(position,'') = ${meta.position || ''} LIMIT 1`;
    if (existing) {
      await sql`UPDATE report_drafts SET school = ${meta.school}, class_year = ${meta.classYear}, report_id = ${meta.reportId}, payload = ${JSON.stringify(p)}, updated_at = now() WHERE id = ${existing.id}`;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ id: existing.id, progress: progress(p) }) };
    }
    const [row] = await sql`INSERT INTO report_drafts (scout_id, prospect_name, school, position, class_year, report_id, payload)
      VALUES (${scout.scout_id}, ${name}, ${meta.school}, ${meta.position}, ${meta.classYear}, ${meta.reportId}, ${JSON.stringify(p)}) RETURNING id`;
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ id: row.id, progress: progress(p) }) };
  } catch (err) {
    console.error('report-draft error:', err);
    return fail(500, err.message);
  }
};
