/* =====================================================================
   list-targets.js  (v3 — adds prospect photo keys and wingspan)
   Deploy to: netlify/functions/list-targets.js  (PORTAL repo — the same
   repo scout-home.html and admin.html live in)

   Changes from v1:
     1. Returns prospect_id, so the edit sheet can save commitment and
        offers. Without it those sections stay locked.
     2. Returns height, weight, and film_link. v1 selected source_link
        but not film_link, even though both columns exist, so the edit
        sheet had nothing to prefill.
     3. Joins prospects and programs for commit status, the committed
        school's display name and logo id, and an offer count, so the
        Unscouted cards can show commit state without a second call.
     4. Optional ?includeAll=1 to return assignments in any status. The
        default still filters to open, so nothing changes for the
        existing scout home behavior.

   Still no auth, matching list-reports. See the note at the bottom.

   REQUIRES: 001_prospects_commitment.sql to have run. Before that
   migration the prospects and programs tables do not exist and this
   query fails. Deploy in that order.
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  const params  = event.queryStringParameters || {};
  const scoutId = params.scoutId;
  const includeAll = params.includeAll === '1' || params.includeAll === 'true';

  if (!scoutId) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'scoutId required' }) };
  }

  try {
    /* Two near-identical queries rather than string interpolation, so the
       tagged template keeps parameterizing and nothing user-supplied ever
       reaches the SQL text. */
    const rows = includeAll
      ? await sql`
          SELECT a.id, a.name, a.position, a.class_year, a.school, a.level,
                 a.priority, a.status, a.note, a.source_link, a.film_link,
                 a.height, a.weight, a.assigned_at, a.updated_at, a.updated_by,
                 a.prospect_id,
                 p.commit_status, p.committed_to, p.committed_to_other,
                 p.commit_date, p.commit_source, p.commit_reported_by,
                 p.headshot_key, p.wingspan_key, p.wingspan,
                 prog.short_name   AS committed_to_name,
                 prog.espn_logo_id AS committed_to_logo,
                 prog.primary_color AS committed_to_color,
                 COALESCE((SELECT count(*) FROM prospect_offers o
                            WHERE o.prospect_id = a.prospect_id), 0) AS offer_count
          FROM scout_assignments a
          LEFT JOIN prospects p   ON p.id = a.prospect_id
          LEFT JOIN programs prog ON prog.school_key = p.committed_to
          WHERE a.scout_id = ${scoutId}
          ORDER BY
            CASE WHEN a.priority = 'high' THEN 0 ELSE 1 END,
            a.assigned_at DESC`
      : await sql`
          SELECT a.id, a.name, a.position, a.class_year, a.school, a.level,
                 a.priority, a.status, a.note, a.source_link, a.film_link,
                 a.height, a.weight, a.assigned_at, a.updated_at, a.updated_by,
                 a.prospect_id,
                 p.commit_status, p.committed_to, p.committed_to_other,
                 p.commit_date, p.commit_source, p.commit_reported_by,
                 p.headshot_key, p.wingspan_key, p.wingspan,
                 prog.short_name   AS committed_to_name,
                 prog.espn_logo_id AS committed_to_logo,
                 prog.primary_color AS committed_to_color,
                 COALESCE((SELECT count(*) FROM prospect_offers o
                            WHERE o.prospect_id = a.prospect_id), 0) AS offer_count
          FROM scout_assignments a
          LEFT JOIN prospects p   ON p.id = a.prospect_id
          LEFT JOIN programs prog ON prog.school_key = p.committed_to
          WHERE a.scout_id = ${scoutId}
            AND a.status = 'open'
          ORDER BY
            CASE WHEN a.priority = 'high' THEN 0 ELSE 1 END,
            a.assigned_at DESC`;

    /* Shape matches what scout-home.html expects. */
    const targets = rows.map(r => ({
      id:          r.id,
      prospectId:  r.prospect_id,

      name:          r.name,
      position:      r.position,
      positionLabel: r.position,
      school:        r.school,
      classYear:     r.class_year,
      level:         r.level,
      priority:      r.priority,
      status:        r.status,
      note:          r.note,

      height:     r.height,
      weight:     r.weight,
      filmLink:   r.film_link,
      sourceLink: r.source_link,

      commitStatus:     r.commit_status || 'uncommitted',
      committedTo:      r.committed_to,
      committedToOther: r.committed_to_other,
      committedToName:  r.committed_to_name,
      committedToLogo:  r.committed_to_logo,
      committedToColor: r.committed_to_color,
      /* date only — the edit sheet slices to 10 chars for the date input */
      commitDate:       r.commit_date ? String(r.commit_date).slice(0, 10) : null,
      commitSource:     r.commit_source,
      commitReportedBy: r.commit_reported_by,

      offerCount: Number(r.offer_count) || 0,

      headshotKey: r.headshot_key,
      wingspanKey: r.wingspan_key,
      wingspan:    r.wingspan,

      addedAt:   r.assigned_at,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by
    }));

    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(targets) };
  } catch (err) {
    console.error('list-targets error:', err);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};

/* ---------------------------------------------------------------------
   NOTE ON status

   This endpoint filters on status = 'open', which means status controls
   whether a player appears on a scout's board at all. Because of that,
   remove 'status' from the EDITABLE array in update-assignment.js. A
   scout who changes it makes the player vanish from their own list with
   no way to get him back. Retiring an assignment is an admin action.

   The edit sheet never sends status, so nothing breaks today. Removing
   it from the whitelist just closes the path.
--------------------------------------------------------------------- */
