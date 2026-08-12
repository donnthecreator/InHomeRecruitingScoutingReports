/* =====================================================================
   list-reports.js
   Deploy to: netlify/functions/list-reports.js  (REPORTS repo, same
   as submit-report.js)

   GET /.netlify/functions/list-reports              -> most recent 500, all scouts
   GET /.netlify/functions/list-reports?scoutId=<id> -> just that scout's reports

   Called by scout-home.html (with scoutId) and by admin.html's
   admin-data.js loadAll() indirectly — if you'd rather admin read
   straight from this instead of duplicating the query in admin-data.js,
   point loadAll() at this endpoint instead. Left as its own function
   here since admin.html already has DB access via admin-data.js.
===================================================================== */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  const scoutId = (event.queryStringParameters || {}).scoutId;

  try {
    const rows = scoutId
      ? await sql`
          SELECT id, prospect, position, position_label, archetype, class_year, school,
                 home_city, home_state, latitude, longitude,
                 height, weight, film_link, eval_camp,
                 scout_name, scout_id, scout_role, scout_region, date_evaluated,
                 football_iq, narrative, has_headshot, recommendation_tier, inhome_score,
                 created_at
          FROM reports
          WHERE scout_id = ${scoutId}
          ORDER BY COALESCE(date_evaluated::timestamptz, created_at) DESC
          LIMIT 500`
      : await sql`
          SELECT id, prospect, position, position_label, archetype, class_year, school,
                 home_city, home_state, latitude, longitude,
                 height, weight, film_link, eval_camp,
                 scout_name, scout_id, scout_role, scout_region, date_evaluated,
                 football_iq, narrative, has_headshot, recommendation_tier, inhome_score,
                 created_at
          FROM reports
          ORDER BY created_at DESC
          LIMIT 500`;

    const reports = rows.map(r => ({
      id: r.id,
      prospect: r.prospect,
      position: r.position,
      positionLabel: r.position_label,
      archetype: r.archetype,
      classYear: r.class_year,
      school: r.school,
      homeCity: r.home_city,
      homeState: r.home_state,
      latitude: r.latitude,
      longitude: r.longitude,
      height: r.height,
      weight: r.weight,
      filmLink: r.film_link,
      evalCamp: r.eval_camp,
      scoutName: r.scout_name,
      scoutId: r.scout_id,
      scoutRole: r.scout_role,
      scoutRegion: r.scout_region,
      dateEvaluated: r.date_evaluated,
      createdAt: r.created_at,
      footballIQ: r.football_iq,
      narrative: r.narrative,
      hasHeadshot: r.has_headshot,
      recommendationTier: r.recommendation_tier,
      inhomeScore: r.inhome_score
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reports)
    };
  } catch (err) {
    console.error('list-reports error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
