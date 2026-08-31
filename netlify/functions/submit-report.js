/* =====================================================================
   submit-report.js  (v2)
   Deploy to: netlify/functions/submit-report.js  (REPORTS repo —
   inhomepdfreports.netlify.app)

   Changes from v1:
     1. inhome_score now parseFloat, not parseInt. The column is numeric
        and your model produces one decimal. v1 stored 82.4 as 82, so
        every report disagreed with the PDF the scout was looking at.
        A legitimate score of 0 is also no longer silently nulled.
     2. Optional scout auth behind REQUIRE_SCOUT_AUTH. Off by default so
        deploying this does not break your live form. Flip it to true
        once the form sends accessCode.
     3. Find-or-create against the prospects table, so every report links
        to a canonical player and inherits his commitment status.
     4. Geocode results cached in the prospect row. Nominatim is limited
        to one request per second and v1 called it on every submit.

   ENV:
     DATABASE_URL          required
     REQUIRE_SCOUT_AUTH    "true" to enforce access codes (default off)
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const fail = (code, msg) => ({ statusCode: code, headers: JSON_HEADERS, body: JSON.stringify({ error: msg }) });

const REQUIRE_AUTH = process.env.REQUIRE_SCOUT_AUTH === 'true';

/* Same normalization the migration uses. Must stay in sync or you get
   duplicate prospects. */
const nameKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

/* numeric, not integer. Preserves 82.4 and preserves a real 0. */
function toNumeric(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

async function geocode(city, state) {
  if (!city && !state) return { lat: null, lng: null };
  const query = [city, state, 'USA'].filter(Boolean).join(', ');
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'InHome-EIS-ScoutingPlatform/1.0 (inhomecollegeprospects.com)' } }
    );
    if (!res.ok) return { lat: null, lng: null };
    const data = await res.json();
    if (!data.length) return { lat: null, lng: null };
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    console.error('Geocode failed, saving report without coordinates:', err.message);
    return { lat: null, lng: null };
  }
}

async function resolveScout(accessCode) {
  if (!accessCode || !String(accessCode).trim()) return null;
  const rows = await sql`
    SELECT scout_id, name FROM scouts
    WHERE upper(access_code) = ${String(accessCode).trim().toUpperCase()}
    LIMIT 1`;
  return rows.length ? rows[0] : null;
}

/* Returns the canonical prospect id, creating the row if this is the
   first time anyone has filed on him. Also returns cached coordinates
   so we can skip the Nominatim call on repeat prospects. */
async function findOrCreateProspect(p) {
  const key = nameKey(p.prospect);
  if (!key) return null;

  const [found] = await sql`
    SELECT id, latitude, longitude FROM prospects
    WHERE name_key = ${key}
      AND COALESCE(school,'')     = ${p.school || ''}
      AND COALESCE(class_year,'') = ${p.classYear || ''}
    LIMIT 1`;

  if (found) return found;

  const [created] = await sql`
    INSERT INTO prospects
      (name, name_key, school, class_year, position, position_label, level,
       height, weight, film_link, home_city, home_state)
    VALUES
      (${p.prospect}, ${key}, ${p.school || null}, ${p.classYear || null},
       ${p.position || null}, ${p.positionLabel || null}, ${p.level || null},
       ${p.height || null}, ${p.weight || null}, ${p.filmLink || null},
       ${p.homeCity || null}, ${p.homeState || null})
    ON CONFLICT (name_key, COALESCE(school,''), COALESCE(class_year,''))
      DO UPDATE SET updated_at = now()
    RETURNING id, latitude, longitude`;

  return created;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return fail(400, 'Bad request'); }

  if (!payload.prospect || !payload.prospect.trim()) {
    return fail(400, 'Prospect name required');
  }

  /* Scout identity. When auth is on, scout_id comes from the database,
     never from the browser. When off, v1 behavior is preserved. */
  let scoutId   = payload.scoutId || null;
  let scoutName = payload.scoutName || null;

  if (REQUIRE_AUTH) {
    const scout = await resolveScout(payload.accessCode);
    if (!scout) return fail(401, 'Invalid or missing scout access code');
    scoutId   = scout.scout_id;
    scoutName = scout.name || scoutName;
  }

  try {
    const prospectRow = await findOrCreateProspect(payload);
    const prospectId  = prospectRow ? prospectRow.id : null;

    /* Reuse cached coordinates when we already have them. */
    let lat = prospectRow ? prospectRow.latitude  : null;
    let lng = prospectRow ? prospectRow.longitude : null;

    if (lat === null || lng === null) {
      ({ lat, lng } = await geocode(payload.homeCity, payload.homeState));
      if (prospectId && lat !== null) {
        try {
          await sql`UPDATE prospects SET latitude = ${lat}, longitude = ${lng} WHERE id = ${prospectId}`;
        } catch (err) {
          console.error('coordinate cache write failed:', err.message);
        }
      }
    }

    const rows = await sql`
      INSERT INTO reports (
        prospect_id,
        prospect_name, position, position_label, archetype, class_year, school,
        home_city, home_state, latitude, longitude,
        height, weight, film_link, eval_camp,
        scout_name, scout_id, scout_role, scout_region, date_evaluated,
        football_iq, narrative, has_headshot, recommendation_tier, inhome_score,
        raw
      ) VALUES (
        ${prospectId},
        ${payload.prospect}, ${payload.position || null}, ${payload.positionLabel || null},
        ${payload.archetype || null}, ${payload.classYear || null}, ${payload.school || null},
        ${payload.homeCity || null}, ${payload.homeState || null}, ${lat}, ${lng},
        ${payload.height || null}, ${payload.weight || null}, ${payload.filmLink || null}, ${payload.evalCamp || null},
        ${scoutName}, ${scoutId}, ${payload.scoutRole || null},
        ${payload.scoutRegion || null}, ${payload.dateEvaluated || null},
        ${payload.footballIQ || null}, ${payload.narrative || null}, ${!!payload.hasHeadshot},
        ${payload.recommendationTier || null}, ${toNumeric(payload.inhomeScore)},
        ${JSON.stringify(payload.raw || {})}
      )
      RETURNING id`;

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ success: true, reportId: rows[0].id, prospectId })
    };
  } catch (err) {
    console.error('submit-report error:', err);
    return fail(500, err.message);
  }
};
