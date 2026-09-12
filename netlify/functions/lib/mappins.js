/* Every prospect as a map pin. Exact coordinates when the prospect has
   them, otherwise the school's saved location (a rough estimate that is
   still far more useful than nothing). Schools are located once and
   stored in school_locations, keyed like logos. */
const { schoolKey } = require('./logos');

async function ensureTable(sql) {
  await sql`CREATE TABLE IF NOT EXISTS school_locations (
    school_key TEXT PRIMARY KEY,
    display_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    state TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

async function pins(sql, base) {
  await ensureTable(sql);
  const locs = {};
  (await sql`SELECT school_key, latitude, longitude FROM school_locations WHERE latitude IS NOT NULL`)
    .forEach(r => { locs[r.school_key] = { lat: Number(r.latitude), lng: Number(r.longitude) }; });
  let logos = {};
  try { (await sql`SELECT school_key, blob_key FROM school_logos`).forEach(r => { logos[r.school_key] = `${base}/.netlify/functions/frame?key=${encodeURIComponent(r.blob_key)}`; }); } catch (e) {}

  const prospects = await sql`
    SELECT p.id, p.name, p.name_key, p.school, p.position, p.class_year, p.level, p.home_city, p.home_state,
           p.latitude, p.longitude, p.headshot_key,
           (SELECT r.id FROM reports r WHERE r.prospect_id = p.id ORDER BY r.created_at DESC LIMIT 1) AS report_id,
           (SELECT r.inhome_score FROM reports r WHERE r.prospect_id = p.id ORDER BY r.created_at DESC LIMIT 1) AS inhome_score,
           (SELECT string_agg(DISTINCT upper(pp.program_code), ', ') FROM program_prospects pp WHERE pp.prospect_id = p.id) AS boards
    FROM prospects p`;

  let perf = [];
  try {
    perf = await sql`
      SELECT DISTINCT ON (lower(regexp_replace(name, '[^A-Za-z]', '', 'g')), COALESCE(school,''))
             name, school, position, class_year, level
      FROM player_performances pp
      WHERE NOT EXISTS (SELECT 1 FROM prospects p WHERE p.name_key = lower(regexp_replace(pp.name, '[^A-Za-z]', '', 'g')) AND COALESCE(p.school,'') = COALESCE(pp.school,''))
      ORDER BY lower(regexp_replace(name, '[^A-Za-z]', '', 'g')), COALESCE(school,''), created_at DESC`;
  } catch (e) { perf = []; }

  const out = [];
  const missingSchools = new Map();
  const place = (rec) => {
    const sk = schoolKey(rec.school);
    if (rec.latitude && rec.longitude) return { lat: Number(rec.latitude), lng: Number(rec.longitude), exact: true };
    if (locs[sk]) return { lat: locs[sk].lat, lng: locs[sk].lng, exact: false };
    if (rec.school) missingSchools.set(sk, { school: rec.school, state: rec.home_state || null, level: rec.level || null });
    return null;
  };
  prospects.forEach(p => {
    const loc = place(p);
    out.push({
      id: p.id, name: p.name, school: p.school, position: p.position, classYear: p.class_year, level: p.level || 'HS',
      city: p.home_city, state: p.home_state, boards: p.boards || null,
      reportId: p.report_id || null, score: p.inhome_score != null ? Number(p.inhome_score) : null,
      headshotUrl: p.headshot_key ? `${base}/.netlify/functions/frame?key=${encodeURIComponent(p.headshot_key)}` : null,
      logoUrl: logos[schoolKey(p.school)] || null,
      lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, exact: loc ? loc.exact : false,
      status: p.report_id ? 'scouted' : (p.boards ? 'board' : 'prospect')
    });
  });
  perf.forEach(p => {
    const loc = place(p);
    out.push({
      id: null, name: p.name, school: p.school, position: p.position, classYear: p.class_year, level: p.level || 'HS',
      city: null, state: null, boards: null, reportId: null, score: null, headshotUrl: null,
      logoUrl: logos[schoolKey(p.school)] || null,
      lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, exact: loc ? loc.exact : false,
      status: 'tracked'
    });
  });
  return { pins: out, missingSchools: [...missingSchools.values()] };
}

module.exports = { pins, ensureTable };
