/* ============================================================================
   list-reports.js
   InHome Recruiting Intelligence

   WHAT THIS DOES
   Reads scouting reports out of Neon and returns them as JSON, already shaped
   the way the coach portal expects. This is the READ side. submit-report.js is
   the WRITE side. This file never writes anything, so it cannot corrupt data.

   WHY IT LOOKS DEFENSIVE
   It does "SELECT *" and maps columns in JavaScript instead of naming columns
   in SQL. That means if a column is named prospect_name in one place and
   prospect in another, this still works. Nothing here needs to be kept in sync
   with the schema by hand.

   ENDPOINT
   GET /.netlify/functions/list-reports
   Optional query params:
     ?position=WR      only that position
     ?school=Samford   substring match on the recruiting school field
     ?limit=100        default 200, max 500
     ?debug=1          returns the raw column names it found (troubleshooting)

   ENVIRONMENT
   Needs a Postgres connection string in one of these env vars:
     NETLIFY_DATABASE_URL  (set automatically by the Netlify Neon extension)
     DATABASE_URL          (common manual name)
     NEON_DATABASE_URL
   Set it in Netlify under Project configuration > Environment variables.
   ========================================================================== */

const { neon } = require('@neondatabase/serverless');

/* ---------------------------------------------------------------------------
   CORS
   The coach portal is deployed as a SEPARATE Netlify site, which means the
   browser treats this as a cross-origin request and will block it unless we
   send these headers back. If you ever see "blocked by CORS policy" in the
   browser console, this is the block that matters.

   ALLOWED_ORIGINS: '*' lets any site read this endpoint. Once your portal has
   a fixed URL, replace '*' with that exact URL to lock it down.
--------------------------------------------------------------------------- */
const ALLOWED_ORIGIN = process.env.PORTAL_ORIGIN || '*';

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Access-Key',
  'Content-Type': 'application/json',
  // Reports change rarely. 30s cache keeps a demo snappy without going stale.
  'Cache-Control': 'public, max-age=30'
};

function reply(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

/* ---------------------------------------------------------------------------
   Column lookup helper.
   Given a row and a list of candidate names, return the first one that has a
   value. This is what makes the function immune to snake_case vs camelCase and
   to small naming differences in the schema.
--------------------------------------------------------------------------- */
function pick(row, names, fallback = null) {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n];
  }
  return fallback;
}

/* ---------------------------------------------------------------------------
   raw column normalizer.
   Postgres jsonb comes back as a real object. If the column was ever created
   as text, it comes back as a string that still needs parsing. Handle both,
   and never throw on malformed JSON.
--------------------------------------------------------------------------- */
function parseRaw(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (err) {
    console.warn('list-reports: could not parse raw column:', err.message);
    return {};
  }
}

/* ---------------------------------------------------------------------------
   Shape one database row into the object the coach portal renders.
   The portal's REPORTS array expects exactly these keys.
--------------------------------------------------------------------------- */
function toPortalShape(row) {
  const raw = parseRaw(pick(row, ['raw', 'raw_data', 'rawdata', 'data'], null));

  return {
    id:                 pick(row, ['id', 'report_id']),
    prospect:           pick(row, ['prospect', 'prospect_name', 'player_name', 'name'], 'Unnamed prospect'),
    position:           String(pick(row, ['position', 'pos'], 'ATH')).toUpperCase(),
    positionLabel:      pick(row, ['position_label', 'positionLabel']),
    archetype:          pick(row, ['archetype', 'role']),
    classYear:          pick(row, ['class_year', 'classYear', 'grad_year', 'class']),
    school:             pick(row, ['school', 'high_school', 'highschool']),
    height:             pick(row, ['height']),
    weight:             pick(row, ['weight']),
    filmLink:           pick(row, ['film_link', 'filmLink', 'film_url', 'hudl']),
    evalCamp:           pick(row, ['eval_camp', 'evalCamp', 'camp', 'evaluation_camp']),
    scoutName:          pick(row, ['scout_name', 'scoutName', 'scout'], 'InHome Scout Network'),
    dateEvaluated:      pick(row, ['date_evaluated', 'dateEvaluated', 'eval_date']),
    footballIQ:  Number(pick(row, ['football_iq', 'footballIQ', 'iq'], 5)) || 5,
    narrative:          pick(row, ['narrative', 'notes', 'scout_notes'], ''),
    recommendationTier: pick(row, ['recommendation_tier', 'recommendationTier', 'tier']),

    // Server-computed values. The portal recomputes from raw when grades are
    // present and only falls back to these when they are not.
    inhomeScore:        pick(row, ['inhome_score', 'inhomeScore', 'score']),
    translationIndex:   pick(row, ['translation_index', 'translationIndex', 'ti']),

    createdAt:          pick(row, ['created_at', 'createdAt', 'submitted_at']),

    // Everything position-specific, including track, lives in here.
    raw: raw
  };
}

/* ========================================================================== */

exports.handler = async (event) => {
  // Browsers send a preflight OPTIONS request before the real cross-origin GET.
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return reply(405, { success: false, error: 'Use GET.' });
  }

  // --- connection string -------------------------------------------------
  const connectionString =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    // Loud, specific failure. This is the single most common deploy mistake.
    return reply(500, {
      success: false,
      error: 'No database connection string found.',
      fix: 'In Netlify: Project configuration > Environment variables. Add NETLIFY_DATABASE_URL (or DATABASE_URL) with your Neon connection string, then redeploy.'
    });
  }

  // --- optional shared-key gate -----------------------------------------
  // Only enforced if you set PORTAL_ACCESS_KEY in Netlify. Leave it unset while
  // testing; set it before the endpoint is public if you want it private.
  const requiredKey = process.env.PORTAL_ACCESS_KEY;
  if (requiredKey) {
    const params = event.queryStringParameters || {};
    const supplied = (event.headers && (event.headers['x-access-key'] || event.headers['X-Access-Key'])) || params.key;
    if (supplied !== requiredKey) {
      return reply(401, { success: false, error: 'Missing or invalid access key.' });
    }
  }

  const sql = neon(connectionString);
  const params = event.queryStringParameters || {};

  // limit: clamp so a bad query string can never pull the whole table
  let limit = parseInt(params.limit, 10);
  if (isNaN(limit) || limit < 1) limit = 200;
  if (limit > 500) limit = 500;

  try {
    /* --------------------------------------------------------------------
       Read the reports.
       SELECT * on purpose. Naming columns here would mean this file has to be
       edited every time the schema changes. Mapping happens in JavaScript
       instead, in toPortalShape above.

       Ordering: try created_at, fall back to id. Some schemas have one and not
       the other, so this is attempted rather than assumed.
    -------------------------------------------------------------------- */
    let rows;
    try {
      rows = await sql`
        SELECT * FROM scout_reports
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } catch (orderErr) {
      console.warn('list-reports: created_at ordering failed, falling back to id:', orderErr.message);
      rows = await sql`
        SELECT * FROM scout_reports
        ORDER BY id DESC
        LIMIT ${limit}
      `;
    }

    // Debug mode: shows the actual column names in your table. Use this once
    // after deploying to confirm the mapping above is catching everything.
    if (params.debug === '1') {
      return reply(200, {
        success: true,
        rowCount: rows.length,
        columns: rows.length ? Object.keys(rows[0]) : [],
        sampleRow: rows.length ? rows[0] : null
      });
    }

    let reports = rows.map(toPortalShape);

    // --- optional filters (applied in JS so they work regardless of schema)
    if (params.position) {
      const want = String(params.position).toUpperCase();
      reports = reports.filter(r => r.position === want);
    }
    if (params.school) {
      const want = String(params.school).toLowerCase();
      reports = reports.filter(r => (r.school || '').toLowerCase().includes(want));
    }

    return reply(200, {
      success: true,
      count: reports.length,
      reports
    });

  } catch (err) {
    console.error('list-reports failed:', err);

    // Translate the two errors you are most likely to actually hit.
    const msg = String(err.message || err);
    let fix = 'Check the Netlify function log for the full error.';
    if (/relation .* does not exist/i.test(msg)) {
      fix = 'The scout_reports table was not found. Confirm you are pointed at the right Neon database and that schema.sql has been run.';
    } else if (/password|authentication|SASL/i.test(msg)) {
      fix = 'The database rejected the credentials. Regenerate the Neon connection string and update the env var in Netlify.';
    }

    return reply(500, { success: false, error: msg, fix });
  }
};
