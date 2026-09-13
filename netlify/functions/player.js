/* =====================================================================
   player.js
   GET /.netlify/functions/player?id=<prospectId>
   GET /.netlify/functions/player?name=<name>&school=<school>

   Public, CORS-open: one prospect's profile for the coach portal.
   Bio, verified measurables, photo and logo, every report on him,
   his performance-log games, completed assessments (scores and the
   diagnosis, never the raw interview text), and which boards he is on.
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const { logoMap, schoolKey } = require('./lib/logos');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  try {
    /* columns added by later features; harmless if they already exist */
    try { await sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS verifications JSONB NOT NULL DEFAULT '{}'::jsonb`; } catch (e) {}

    const h = event.headers || {};
    const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;
    const qs = event.queryStringParameters || {};
    let p = null;
    if (qs.id) [p] = await sql`SELECT * FROM prospects WHERE id = ${parseInt(qs.id, 10)}`;
    else if (qs.name) {
      const nk = String(qs.name).toLowerCase().replace(/[^a-z]/g, '');
      const rows = await sql`SELECT * FROM prospects WHERE name_key = ${nk} ORDER BY (COALESCE(school,'') = ${qs.school || ''}) DESC, id DESC LIMIT 1`;
      p = rows[0] || null;
    }
    if (!p) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Player not found' }) };

    const logos = await logoMap(sql, base);
    const reports = await sql`SELECT id, scout_name, scout_role, inhome_score, recommendation_tier, archetype, position, date_evaluated, created_at, narrative
                              FROM reports WHERE prospect_id = ${p.id} ORDER BY created_at DESC`;
    let games = [];
    try {
      games = await sql`SELECT to_char(performance_date,'YYYY-MM-DD') AS date, stat_line, grade, source_link, school, level
                        FROM player_performances WHERE lower(regexp_replace(name,'[^A-Za-z]','','g')) = ${p.name_key} ORDER BY performance_date DESC NULLS LAST LIMIT 30`;
    } catch (e) {}
    let assessments = [];
    try {
      const rows = await sql`SELECT kind, score_pct, score_detail, to_char(completed_at,'YYYY-MM-DD') AS completed FROM assessments WHERE prospect_id = ${p.id} AND status = 'complete' ORDER BY completed_at DESC`;
      assessments = rows.map(a => ({ kind: a.kind, pct: a.score_pct != null ? Number(a.score_pct) : null, completed: a.completed,
        diagnosis: a.score_detail ? a.score_detail.diagnosis || null : null, mbti: a.score_detail && a.score_detail.mbti ? a.score_detail.mbti.type : null }));
    } catch (e) {}
    let boards = [];
    try { boards = (await sql`SELECT upper(program_code) AS code FROM program_prospects WHERE prospect_id = ${p.id}`).map(r => r.code); } catch (e) {}

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({
      id: p.id, name: p.name, school: p.school, position: p.position, positionLabel: p.position_label, classYear: p.class_year, level: p.level,
      homeCity: p.home_city, homeState: p.home_state, height: p.height, weight: p.weight, wingspan: p.wingspan, filmLink: p.film_link,
      verifications: p.verifications || {},
      headshotUrl: p.headshot_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(p.headshot_key)}` : null,
      wingspanUrl: p.wingspan_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(p.wingspan_key)}` : null,
      logoUrl: logos[schoolKey(p.school)] || null,
      boards,
      reports: reports.map(r => ({ id: r.id, scoutName: r.scout_name, scoutRole: r.scout_role, score: r.inhome_score != null ? Number(r.inhome_score) : null,
        tier: r.recommendation_tier, archetype: r.archetype, position: r.position, date: r.date_evaluated || (r.created_at ? String(r.created_at).slice(0, 10) : null), narrative: r.narrative })),
      games: games.map(g => ({ date: g.date, statLine: g.stat_line, grade: g.grade != null ? Number(g.grade) : null, link: g.source_link })),
      assessments
    }) };
  } catch (err) {
    console.error('player error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
