/* =====================================================================
   admin-data.js
   Deploy to: netlify/functions/admin-data.js  (PORTAL repo)

   Every admin read and write goes through here. The token from
   verify-admin.js is re-checked on every single call, so a user who
   unhides the admin panel in devtools still gets 401 on all data.

   REQUIRED ENV VARS:
     ADMIN_SECRET   same value used by verify-admin.js
     DATABASE_URL   your existing Neon connection string

   TABLES: see admin-schema.sql

   NOTE ON THE REPORTS QUERY: this reads your existing reports table.
   Column names below are my best guess from the submit-report payload.
   If your columns differ, fix the SELECT in loadAll() only. Nothing
   else touches that table.
===================================================================== */

const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

/* ---------- SCOUT CODE / ID GENERATION ---------- */
function slugId(name) {
  const parts = name.trim().split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  if (!parts.length) return 'scout';
  const first = parts[0][0].toLowerCase();
  const last = parts[parts.length - 1].replace(/[^a-zA-Z]/g, '').toLowerCase();
  return (first + last) || 'scout';
}
function slugCode(name) {
  const parts = name.trim().split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  const last = (parts[parts.length - 1] || 'SCOUT').replace(/[^a-zA-Z]/g, '').toUpperCase();
  return last + '26';
}
async function uniqueScoutId(base) {
  let candidate = base, n = 2;
  while (true) {
    const existing = await sql`SELECT 1 FROM scouts WHERE scout_id = ${candidate} LIMIT 1`;
    if (!existing.length) return candidate;
    candidate = base + n;
    n++;
  }
}
async function uniqueAccessCode(base) {
  let candidate = base, n = 2;
  while (true) {
    const existing = await sql`SELECT 1 FROM scouts WHERE access_code = ${candidate} LIMIT 1`;
    if (!existing.length) return candidate;
    candidate = base.replace(/26$/, '') + n + '26';
    n++;
  }
}

/* ---------- AUTH ---------- */
function verifyToken(event) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const header = event.headers.authorization || event.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;

  const [expiresStr, sig] = token.split('.');
  if (!expiresStr || !sig) return false;

  const expires = Number(expiresStr);
  if (!expires || Date.now() > expires) return false;

  const expected = crypto.createHmac('sha256', secret).update(expiresStr).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const ok   = (body) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const fail = (code, error) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error }) });

/* ---------- HANDLER ---------- */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
  if (!verifyToken(event)) return fail(401, 'Unauthorized');

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return fail(400, 'Bad request'); }

  const { action } = body;

  try {
    switch (action) {

      case 'listScouts': {
        const scouts = await sql`SELECT * FROM scouts ORDER BY active DESC, name`;
        return ok({ scouts });
      }

      case 'createScout': {
        const { name, role, region } = body;
        if (!name || !name.trim()) return fail(400, 'name required');

        const scoutId = await uniqueScoutId(slugId(name));
        const accessCode = await uniqueAccessCode(slugCode(name));

        const rows = await sql`
          INSERT INTO scouts (scout_id, access_code, name, role, region, active)
          VALUES (${scoutId}, ${accessCode}, ${name.trim()}, ${role || 'Regional Scout'},
                  ${region || 'Unassigned'}, TRUE)
          RETURNING *`;
        return ok({ scout: rows[0] });
      }

      case 'updateScout': {
        const { id, active, role, region } = body;
        if (!id) return fail(400, 'id required');
        if (active !== undefined) {
          await sql`UPDATE scouts SET active = ${active} WHERE id = ${id}`;
        }
        if (role) {
          await sql`UPDATE scouts SET role = ${role} WHERE id = ${id}`;
        }
        if (region) {
          await sql`UPDATE scouts SET region = ${region} WHERE id = ${id}`;
        }
        return ok({ success: true });
      }

      case 'loadAll': {
        const scouts = await sql`SELECT * FROM scouts ORDER BY active DESC, name`;
        const assignments = await sql`
          SELECT * FROM scout_assignments ORDER BY assigned_at DESC`;
        const performances = await sql`
          SELECT * FROM player_performances ORDER BY performance_date DESC`;

        /* Adjust these column names if your reports table differs. */
        let reports = [];
        try {
          reports = await sql`
            SELECT id, prospect, position, position_label, school, class_year,
                   home_city, home_state, latitude, longitude,
                   inhome_score, recommendation_tier,
                   scout_id, scout_name, date_evaluated, created_at, has_headshot
            FROM reports
            ORDER BY COALESCE(date_evaluated::timestamptz, created_at) DESC
            LIMIT 500`;
        } catch (e) {
          console.error('reports query failed, check column names:', e.message);
        }

        return ok({ scouts, assignments, performances, reports });
      }

      case 'createAssignment': {
        const { name, scout_id, position, class_year, level, school, priority, source_link, note } = body;
        if (!name || !scout_id) return fail(400, 'name and scout_id required');
        const rows = await sql`
          INSERT INTO scout_assignments
            (name, scout_id, position, class_year, level, school, priority, source_link, note, status)
          VALUES
            (${name}, ${scout_id}, ${position || null}, ${class_year || null}, ${level || 'HS'},
             ${school || null}, ${priority || 'normal'}, ${source_link || null}, ${note || null}, 'open')
          RETURNING *`;
        return ok({ assignment: rows[0] });
      }

      case 'updateAssignment': {
        const { id, status, scout_id } = body;
        if (!id) return fail(400, 'id required');
        if (status) {
          await sql`UPDATE scout_assignments SET status = ${status} WHERE id = ${id}`;
        }
        if (scout_id) {
          await sql`UPDATE scout_assignments SET scout_id = ${scout_id} WHERE id = ${id}`;
        }
        return ok({ success: true });
      }

      case 'deleteAssignment': {
        const { id } = body;
        if (!id) return fail(400, 'id required');
        await sql`DELETE FROM scout_assignments WHERE id = ${id}`;
        return ok({ success: true });
      }

      case 'createPerformance': {
        const { name, level, position, class_year, school, stat_line, source_link, performance_date } = body;
        if (!name) return fail(400, 'name required');
        const rows = await sql`
          INSERT INTO player_performances
            (name, level, position, class_year, school, stat_line, source_link, performance_date)
          VALUES
            (${name}, ${level || 'HS'}, ${position || null}, ${class_year || null}, ${school || null},
             ${stat_line || null}, ${source_link || null}, ${performance_date || null})
          RETURNING *`;
        return ok({ performance: rows[0] });
      }

      case 'deletePerformance': {
        const { id } = body;
        if (!id) return fail(400, 'id required');
        await sql`DELETE FROM player_performances WHERE id = ${id}`;
        return ok({ success: true });
      }

      default:
        return fail(400, 'Unknown action: ' + action);
    }
  } catch (err) {
    console.error('admin-data error:', err);
    return fail(500, err.message);
  }
};
