const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event) => {
  const scoutId = (event.queryStringParameters || {}).scoutId;
  try {
    const rows = scoutId
      ? await sql`
          SELECT id, prospect_name, position, position_label, archetype, class_year, school,
                 home_city, home_state, latitude, longitude,
                 height, weight, film_link, eval_camp,
                 scout_name, scout_id, scout_role, scout_region, date_evaluated,
                 football_iq, narrative, has_headshot, recommendation_tier, inhome_score,
                 raw, track, film_grades, athletic_grades, athletic_raw,
                 production_grades, production_raw, gates, interview_data,
                 created_at
          FROM reports
          WHERE scout_id = ${scoutId}
          ORDER BY COALESCE(date_evaluated::timestamptz, created_at) DESC
          LIMIT 500`
      : await sql`
          SELECT id, prospect_name, position, position_label, archetype, class_year, school,
                 home_city, home_state, latitude, longitude,
                 height, weight, film_link, eval_camp,
                 scout_name, scout_id, scout_role, scout_region, date_evaluated,
                 football_iq, narrative, has_headshot, recommendation_tier, inhome_score,
                 raw, track, film_grades, athletic_grades, athletic_raw,
                 production_grades, production_raw, gates, interview_data,
                 created_at
          FROM reports
          ORDER BY created_at DESC
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
        hasHeadshot: r.has_headshot,
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
