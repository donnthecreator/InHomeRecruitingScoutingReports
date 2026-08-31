/* =====================================================================
   update-assignment.js
   Deploy to: netlify/functions/update-assignment.js  (SCOUT repo)

   Lets a scout edit a pre-uploaded player on their own board.

   Security model: the browser sends the scout's access code, never a
   scout_id. The scout_id is resolved server side from the scouts table
   and the UPDATE is scoped by it. Without that scoping, anyone who
   guesses the NAME26 pattern can edit any other scout's board.

   Editable: height, weight, film_link, source_link, school, class_year,
             position, level, priority, note
   Not editable by scouts: name (breaks report matching), scout_id
             (reassignment is an admin action), deletes (unrecoverable).

   Field semantics: a field the client omits is left alone. A field sent
   as "" is a deliberate clear and is written as NULL.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const EDITABLE = [
  'height', 'weight', 'film_link', 'source_link',
  'school', 'class_year', 'position', 'level',
  'priority', 'note'
];

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const fail = (code, msg) => ({ statusCode: code, headers: JSON_HEADERS, body: JSON.stringify({ error: msg }) });

async function resolveScout(accessCode) {
  if (!accessCode || !String(accessCode).trim()) return null;
  const rows = await sql`
    SELECT scout_id, name FROM scouts
    WHERE upper(access_code) = ${String(accessCode).trim().toUpperCase()}
    LIMIT 1`;
  return rows.length ? rows[0] : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return fail(400, 'Bad request'); }

  const assignmentId = parseInt(payload.id, 10);
  if (!assignmentId) return fail(400, 'Assignment id required');

  const scout = await resolveScout(payload.accessCode);
  if (!scout) return fail(401, 'Invalid access code');

  try {
    /* Ownership check first. Fetching the row also gives us current values
       to merge against, so an omitted field keeps its value while an
       explicit "" clears it. */
    const existing = await sql`
      SELECT * FROM scout_assignments
      WHERE id = ${assignmentId} AND scout_id = ${scout.scout_id}
      LIMIT 1`;

    if (!existing.length) return fail(403, 'Not your player, or player not found');
    const cur = existing[0];

    const next = {};
    for (const field of EDITABLE) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const v = payload[field];
        next[field] = (v === null || String(v).trim() === '') ? null : String(v).trim();
      } else {
        next[field] = cur[field];
      }
    }

    const rows = await sql`
      UPDATE scout_assignments SET
        height      = ${next.height},
        weight      = ${next.weight},
        film_link   = ${next.film_link},
        source_link = ${next.source_link},
        school      = ${next.school},
        class_year  = ${next.class_year},
        position    = ${next.position},
        level       = ${next.level},
        priority    = ${next.priority},
        note        = ${next.note},
        updated_at  = now(),
        updated_by  = ${scout.scout_id}
      WHERE id = ${assignmentId} AND scout_id = ${scout.scout_id}
      RETURNING id, name, prospect_id, height, weight, film_link, source_link,
                school, class_year, position, level, priority, status, note,
                updated_at, updated_by`;

    const row = rows[0];

    /* Mirror physicals onto the canonical prospect so the coach portal and
       any future report show the same numbers. Non-fatal by design: if this
       fails the scout's edit still stands. */
    if (row.prospect_id) {
      try {
        await sql`
          UPDATE prospects SET
            height     = ${next.height},
            weight     = ${next.weight},
            film_link  = ${next.film_link},
            school     = ${next.school},
            class_year = ${next.class_year},
            position   = ${next.position},
            level      = ${next.level},
            updated_at = now(),
            updated_by = ${scout.scout_id}
          WHERE id = ${row.prospect_id}`;
      } catch (err) {
        console.error('prospect mirror failed (assignment saved):', err.message);
      }
    }

    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ success: true, assignment: row }) };
  } catch (err) {
    console.error('update-assignment error:', err);
    return fail(500, err.message);
  }
};
