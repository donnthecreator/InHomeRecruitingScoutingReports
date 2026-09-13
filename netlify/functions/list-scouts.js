/* =====================================================================
   list-scouts.js
   Deploy to: netlify/functions/list-scouts.js  (reports repo, the
   netlify/functions folder, next to list-targets.js)

   Returns the scout roster keyed by access code, the exact shape the
   dashboard gate expects:
     { "MANN26": { id:"kmann", name:"Kyle Mann", role:"...", region:"..." }, ... }

   The dashboard merges this over its built-in fallback list, so any
   scout added in Neon can log in without editing the page.

   Tolerant of schema differences: reads whatever columns exist and
   fills role/region only when the table has them.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  try {
    try { await sql`ALTER TABLE scouts ADD COLUMN IF NOT EXISTS headshot_key TEXT`; await sql`ALTER TABLE scouts ADD COLUMN IF NOT EXISTS cover_key TEXT`; } catch (e) {}
    const rows = await sql`SELECT * FROM scouts WHERE access_code IS NOT NULL`;
    const h = (event && event.headers) || {};
    const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;

    const roster = {};
    for (const r of rows) {
      const code = String(r.access_code || '').trim().toUpperCase();
      if (!code) continue;
      roster[code] = {
        id:     r.scout_id,
        name:   r.name || r.scout_id,
        role:   r.role || r.scout_role || 'Regional Scout',
        region: r.region || r.scout_region || 'Unassigned',
        headshotUrl: r.headshot_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(r.headshot_key)}` : null,
        coverUrl: r.cover_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(r.cover_key)}` : null
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(roster)
    };
  } catch (err) {
    console.error('list-scouts error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
