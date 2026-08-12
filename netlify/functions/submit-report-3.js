/* =====================================================================
   submit-report.js
   Deploy to: netlify/functions/submit-report.js  (REPORTS repo —
   inhomepdfreports.netlify.app, the one this file's index.html lives in)

   Saves a scouting report to Neon. Geocodes the prospect's home city/
   state to lat/lng using OpenStreetMap Nominatim (free, no API key)
   so the coach portal map can plot the pin. Geocoding failure never
   blocks the save — city/state text is stored either way, lat/lng
   just come back null and the portal can fall back to a text-only
   location tag instead of a pin.

   REQUIRED ENV VAR:
     DATABASE_URL   your Neon connection string

   REQUIRED TABLE: reports (see reports-schema.sql)
===================================================================== */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
  }

  if (!payload.prospect || !payload.prospect.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Prospect name required' }) };
  }

  const { lat, lng } = await geocode(payload.homeCity, payload.homeState);

  try {
    const rows = await sql`
      INSERT INTO reports (
        prospect, position, position_label, archetype, class_year, school,
        home_city, home_state, latitude, longitude,
        height, weight, film_link, eval_camp,
        scout_name, scout_id, scout_role, scout_region, date_evaluated,
        football_iq, narrative, has_headshot, recommendation_tier, inhome_score,
        raw
      ) VALUES (
        ${payload.prospect}, ${payload.position || null}, ${payload.positionLabel || null},
        ${payload.archetype || null}, ${payload.classYear || null}, ${payload.school || null},
        ${payload.homeCity || null}, ${payload.homeState || null}, ${lat}, ${lng},
        ${payload.height || null}, ${payload.weight || null}, ${payload.filmLink || null}, ${payload.evalCamp || null},
        ${payload.scoutName || null}, ${payload.scoutId || null}, ${payload.scoutRole || null},
        ${payload.scoutRegion || null}, ${payload.dateEvaluated || null},
        ${payload.footballIQ || null}, ${payload.narrative || null}, ${!!payload.hasHeadshot},
        ${payload.recommendationTier || null}, ${parseInt(payload.inhomeScore) || null},
        ${JSON.stringify(payload.raw || {})}
      )
      RETURNING id`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, reportId: rows[0].id })
    };
  } catch (err) {
    console.error('submit-report error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
