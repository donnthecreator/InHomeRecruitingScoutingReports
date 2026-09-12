/* =====================================================================
   list-performances.js
   GET /.netlify/functions/list-performances

   The Production Market feed for the coach portal. Every logged
   performance (admin -> Log a Performance) grouped by player, in date
   order, so the portal can draw a week-to-week line from the grades.
   JUCO and HS both come through; the portal filters by level.

   Public and CORS-open like list-reports.js. Nothing here is more
   sensitive than a box score.

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const { logoMap } = require('./lib/logos');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
function siteBase(event){
  const h = event.headers || {};
  return `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;
}
const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
/* "No. 13 Itawamba CC", "Itawamba Community College", "ITAWAMBA CC" are one school. */
const schoolKey = (s) => String(s || '').toLowerCase()
  .replace(/^no\.?\s*\d+\s*/, '')
  .replace(/community college/g, 'cc').replace(/junior college/g, 'jc')
  .replace(/high school/g, 'hs')
  .replace(/[^a-z0-9]/g, '');

exports.handler = async (event) => {
  try {
    const base = siteBase(event || {});
    /* Column may not exist yet on a fresh table; harmless if it does. */
    try { await sql`ALTER TABLE player_performances ADD COLUMN IF NOT EXISTS grade NUMERIC`; } catch (e) {}
    const logos = await logoMap(sql, base);
    /* headshots live on the prospect record; match by name + school */
    const heads = {};
    try {
      const pr = await sql`SELECT name_key, COALESCE(school,'') AS school, headshot_key, id FROM prospects WHERE headshot_key IS NOT NULL`;
      pr.forEach(x => { heads[x.name_key + '|' + schoolKey(x.school)] = { key: x.headshot_key, id: x.id }; });
    } catch (e) {}

    const rows = await sql`
      SELECT id, name, level, position, class_year, school, stat_line, source_link,
             to_char(performance_date, 'YYYY-MM-DD') AS performance_date, grade,
             to_char(created_at, 'YYYY-MM-DD') AS created_day, created_at
      FROM player_performances
      ORDER BY name, COALESCE(performance_date, created_at::date), created_at`;

    /* Group by player. Key on name + school so two players with the same
       name at different schools stay separate. */
    const byPlayer = new Map();
    for (const r of rows) {
      const k = nameKey(r.name) + '|' + schoolKey(r.school);
      if (!byPlayer.has(k)) {
        byPlayer.set(k, {
          key: k,
          nameKey: nameKey(r.name),
          name: r.name,
          level: r.level || 'HS',
          position: r.position || null,
          classYear: r.class_year || null,
          school: r.school || null,
          entries: []
        });
      }
      const p = byPlayer.get(k);
      /* Later rows can fill in blanks from earlier ones. */
      if (!p.position && r.position) p.position = r.position;
      if (!p.classYear && r.class_year) p.classYear = r.class_year;
      if (r.level === 'JUCO') p.level = 'JUCO';
      if (r.school && String(r.school).length > String(p.school || '').length) p.school = r.school;
      if (p.entries.some(e => e.date === r.performance_date && (e.statLine || '') === (r.stat_line || ''))) continue;
      p.entries.push({
        id: r.id,
        date: r.performance_date || r.created_day || null,
        statLine: r.stat_line || null,
        link: r.source_link || null,
        grade: r.grade != null ? Number(r.grade) : null
      });
    }

    const players = [...byPlayer.values()].map(p => {
      const h = heads[p.nameKey + '|' + schoolKey(p.school)];
      return Object.assign(p, {
        prospectId: h ? h.id : null,
        headshotUrl: h ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(h.key)}` : null,
        logoUrl: logos[schoolKey(p.school)] || null
      });
    });
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ count: players.length, players }) };
  } catch (err) {
    console.error('list-performances error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
