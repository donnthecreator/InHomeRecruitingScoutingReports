/* =====================================================================
   list-program-prospects.js
   GET /.netlify/functions/list-program-prospects?program=MSST26

   The "Prospect Board" tab on the coach portal: every prospect a
   program asked us to look at, with scouting status. A prospect with a
   filed report carries that report's id, score, and tier so the portal
   can open it. One without is "Not yet scouted".

   Public and CORS-open like list-reports.js (the portal lives on a
   different domain). The program code is a portal access code; it is
   not a secret, and this returns nothing a signed-in coach could not
   already see.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function siteBase(event) {
  const h = event.headers || {};
  const host = h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com';
  const proto = h['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
const frameUrl = (base, key) => key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(key)}` : null;

exports.handler = async (event) => {
  const program = String((event.queryStringParameters || {}).program || '').trim().toUpperCase();
  if (!program) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'program required' }) };
  const base = siteBase(event);

  try {
    /* Latest report per prospect, if any. */
    const rows = await sql`
      SELECT pp.id AS link_id, pp.priority, pp.note, pp.added_at,
             p.id AS prospect_id, p.name, p.school, p.position, p.position_label,
             p.class_year, p.home_city, p.home_state, p.level, p.height, p.weight,
             p.film_link, p.headshot_key,
             r.id AS report_id, r.inhome_score, r.recommendation_tier, r.archetype,
             r.scout_name, r.date_evaluated, r.created_at AS report_created_at
      FROM program_prospects pp
      JOIN prospects p ON p.id = pp.prospect_id
      LEFT JOIN LATERAL (
        SELECT id, inhome_score, recommendation_tier, archetype, scout_name, date_evaluated, created_at
        FROM reports
        WHERE prospect_id = p.id
        ORDER BY COALESCE(date_evaluated::timestamptz, created_at) DESC
        LIMIT 1
      ) r ON true
      WHERE upper(pp.program_code) = ${program}
      ORDER BY p.position, p.name`;

    const board = rows.map(x => ({
      prospectId: x.prospect_id,
      prospect: x.name,
      school: x.school,
      position: x.position,
      positionLabel: x.position_label,
      classYear: x.class_year,
      homeCity: x.home_city,
      homeState: x.home_state,
      level: x.level,
      height: x.height,
      weight: x.weight,
      filmLink: x.film_link,
      headshotUrl: frameUrl(base, x.headshot_key),
      priority: x.priority,
      note: x.note,
      addedAt: x.added_at,
      status: x.report_id ? 'scouted' : 'pending',
      reportId: x.report_id || null,
      inhomeScore: x.inhome_score,
      recommendationTier: x.recommendation_tier,
      archetype: x.archetype,
      scoutName: x.scout_name,
      dateEvaluated: x.date_evaluated || x.report_created_at || null
    }));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ program, count: board.length, board }) };
  } catch (err) {
    console.error('list-program-prospects error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
