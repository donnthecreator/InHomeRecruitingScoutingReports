/* =====================================================================
   list-targets.js
   Deploy to: netlify/functions/list-targets.js  (PORTAL repo)

   This is the endpoint scout-home.html already calls. It reads the
   assignments you create in admin.html and returns the open ones for
   that scout, so the admin side and the scout side are the same list.

   No auth on this one, matching how list-reports already works. If you
   want it locked down later, the scout codes would need to move to
   server-side verification the same way the admin code did.
===================================================================== */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  const scoutId = (event.queryStringParameters || {}).scoutId;

  if (!scoutId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'scoutId required' })
    };
  }

  try {
    const rows = await sql`
      SELECT id, name, position, class_year, school, level, priority, note,
             source_link, assigned_at
      FROM scout_assignments
      WHERE scout_id = ${scoutId}
        AND status = 'open'
      ORDER BY
        CASE WHEN priority = 'high' THEN 0 ELSE 1 END,
        assigned_at DESC`;

    // Shape matches what scout-home.html expects.
    const targets = rows.map(r => ({
      id: r.id,
      name: r.name,
      position: r.position,
      positionLabel: r.position,
      school: r.school,
      classYear: r.class_year,
      level: r.level,
      priority: r.priority,
      note: r.note,
      sourceLink: r.source_link,
      addedAt: r.assigned_at
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(targets)
    };
  } catch (err) {
    console.error('list-targets error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
