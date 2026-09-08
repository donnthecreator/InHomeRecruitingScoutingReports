const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

/* Absolute URL base so the coach portal (different domain, no functions
   of its own) can render photos straight from this site's frame.js. */
function siteBase(event){
  const h = event.headers || {};
  const host = h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com';
  const proto = h['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
const frameUrl = (base, key) => key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(key)}` : null;

exports.handler = async (event) => {
  const scoutId = (event.queryStringParameters || {}).scoutId;
  const base = siteBase(event);
  try {
    const rows = scoutId
      ? await sql`
          SELECT r.id, r.prospect_name, r.position, r.position_label, r.archetype, r.class_year, r.school,
                 r.home_city, r.home_state, r.latitude, r.longitude,
                 r.height, r.weight, r.film_link, r.eval_camp,
                 r.scout_name, r.scout_id, r.scout_role, r.scout_region, r.date_evaluated,
                 r.football_iq, r.narrative, r.has_headshot, r.recommendation_tier, r.inhome_score,
                 r.raw, r.track, r.film_grades, r.athletic_grades, r.athletic_raw,
                 r.production_grades, r.production_raw, r.gates, r.interview_data,
                 r.created_at, r.prospect_id,
                 p.headshot_key, p.wingspan_key, p.wingspan
          FROM reports r
          LEFT JOIN prospects p ON p.id = r.prospect_id
          WHERE r.scout_id = ${scoutId}
          ORDER BY COALESCE(r.date_evaluated::timestamptz, r.created_at) DESC
          LIMIT 500`
      : await sql`
          SELECT r.id, r.prospect_name, r.position, r.position_label, r.archetype, r.class_year, r.school,
                 r.home_city, r.home_state, r.latitude, r.longitude,
                 r.height, r.weight, r.film_link, r.eval_camp,
                 r.scout_name, r.scout_id, r.scout_role, r.scout_region, r.date_evaluated,
                 r.football_iq, r.narrative, r.has_headshot, r.recommendation_tier, r.inhome_score,
                 r.raw, r.track, r.film_grades, r.athletic_grades, r.athletic_raw,
                 r.production_grades, r.production_raw, r.gates, r.interview_data,
                 r.created_at, r.prospect_id,
                 p.headshot_key, p.wingspan_key, p.wingspan
          FROM reports r
          LEFT JOIN prospects p ON p.id = r.prospect_id
          ORDER BY r.created_at DESC
          LIMIT 500`;

    const reports = rows.map(r => {
      const raw = r.raw || {};
      return {
        id: r.id,
        prospect: r.prospect_name,
        position: r.position,
        positionLabel: r.position_label,
        archetype: r.archetype,
        classYear: r.class_year,
        school: r.school,
        homeCity: r.home_city,
        homeState: r.home_state,
        lat: r.latitude,
        lng: r.longitude,
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
        prospectId: r.prospect_id,
        headshotKey: r.headshot_key || null,
        wingspanKey: r.wingspan_key || null,
        wingspan: r.wingspan || null,
        /* Prospect-level photo is canonical. Legacy report-time headshot
           (key headshot_<reportId>) still resolves for older reports. */
        headshotUrl: r.headshot_key ? frameUrl(base, r.headshot_key)
                   : (r.has_headshot ? frameUrl(base, 'headshot_' + r.id) : null),
        wingspanUrl: frameUrl(base, r.wingspan_key),
        hasHeadshot: !!(r.headshot_key || r.has_headshot),
        recommendationTier: r.recommendation_tier,
        inhomeScore: r.inhome_score,
        raw: {
          traitGrades:      raw.traitGrades      || r.film_grades       || {},
          athleticGrades:   raw.athleticGrades   || r.athletic_grades   || {},
          athleticRaw:      raw.athleticRaw      || r.athletic_raw      || {},
          productionGrades: raw.productionGrades || r.production_grades || {},
          productionRaw:    raw.productionRaw    || r.production_raw    || {},
          gates:            raw.gates            || r.gates             || {},
          interview:        raw.interview        || r.interview_data    || {},
          track:            raw.track            || r.track             || null,
          eisReps:          raw.eisReps          || [],
          recommendedPrograms: raw.recommendedPrograms || []
        }
      };
    });

    return {
      statusCode: 200,
           headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },      body: JSON.stringify(reports)
    };
  } catch (err) {
    console.error('list-reports error:', err);
    return {
      statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },      body: JSON.stringify({ error: err.message })
    };
  }
};
