const { neon } = require('@neondatabase/serverless');
const { logoMap, schoolKey } = require('./lib/logos');
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
  const qs = event.queryStringParameters || {};
  const scoutId = qs.scoutId;
  const reportId = parseInt(qs.id, 10) || null;
  const base = siteBase(event);
  try {
    const rows = reportId
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
          WHERE r.id = ${reportId}
          LIMIT 1`
      : scoutId
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

    const logos = await logoMap(sql, base);
    const reports = rows.map(r => {
      const raw = r.raw || {};
      return {
        logoUrl: logos[schoolKey(r.school)] || null,
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
          prompts:          raw.prompts          || {},
          /* A rep with hasClip has a real playable video stored under
             clip_<repId> via save-frames.js; the portal plays it directly
             instead of falling back to a Hudl deep link. */
          eisReps: (raw.eisReps || []).map(rep => ({
            ...rep,
            clipUrl: rep.hasClip ? frameUrl(base, 'clip_' + rep.id) : null
          })),
          recommendedPrograms: raw.recommendedPrograms || []
        }
      };
    });

    /* Multiple scouts on one prospect: every report carries the full set
       of evaluations so the portal can show them side by side and a
       consensus (average) score. Built from the rows returned here; for a
       single-report fetch we look the siblings up. */
    let siblings = reports;
    if (reportId && reports.length && reports[0].prospectId) {
      const sib = await sql`
        SELECT r.id, r.scout_name, r.scout_id, r.scout_role, r.inhome_score, r.recommendation_tier, r.archetype,
               r.date_evaluated, r.created_at, r.football_iq, r.narrative
        FROM reports r WHERE r.prospect_id = ${reports[0].prospectId}`;
      siblings = sib.map(x => ({ id: x.id, prospectId: reports[0].prospectId, scoutName: x.scout_name, scoutId: x.scout_id, scoutRole: x.scout_role,
        inhomeScore: x.inhome_score, recommendationTier: x.recommendation_tier, archetype: x.archetype, dateEvaluated: x.date_evaluated, createdAt: x.created_at, footballIQ: x.football_iq, narrative: x.narrative }));
    }
    const byProspect = {};
    siblings.forEach(x => { if (x.prospectId) (byProspect[x.prospectId] = byProspect[x.prospectId] || []).push(x); });
    reports.forEach(rep => {
      const group = rep.prospectId ? (byProspect[rep.prospectId] || []) : [];
      const evals = group.map(x => ({
        reportId: x.id, scoutName: x.scoutName, scoutId: x.scoutId, scoutRole: x.scoutRole || null,
        score: x.inhomeScore != null ? Number(x.inhomeScore) : null, tier: x.recommendationTier || null,
        archetype: x.archetype || null, footballIQ: x.footballIQ != null ? Number(x.footballIQ) : null,
        dateEvaluated: x.dateEvaluated || null, createdAt: x.createdAt || null,
        narrative: x.narrative || null, isThis: x.id === rep.id
      })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const scores = evals.map(e => e.score).filter(v => v != null);
      rep.consensus = {
        count: evals.length,
        avgScore: scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null,
        spread: scores.length > 1 ? +(Math.max(...scores) - Math.min(...scores)).toFixed(1) : 0,
        evaluations: evals
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
