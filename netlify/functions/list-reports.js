/* ============================================================================
   list-reports.js
   InHome Recruiting Intelligence

   Reads scouting reports out of Neon and returns them as JSON shaped for the
   coach portal. READ ONLY: this file never writes, so it cannot corrupt data.

   Uses the same "pg" driver as submit-report.js. Do not add other database
   packages to package.json; one driver is enough.

   ENDPOINT
   GET /.netlify/functions/list-reports
     ?position=WR      only that position
     ?school=Samford   substring match on school
     ?limit=100        default 200, max 500
     ?debug=1          returns table + column names it found (troubleshooting)
   ========================================================================== */

const { Client } = require('pg');

const CORS = {
  'Access-Control-Allow-Origin': process.env.PORTAL_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Access-Key',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=30'
};
const reply = (statusCode, body) => ({ statusCode, headers: CORS, body: JSON.stringify(body) });

/* First matching column wins; immune to snake_case vs camelCase drift. */
function pick(row, names, fallback = null) {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n];
  }
  return fallback;
}

/* jsonb arrives as an object; text columns arrive as strings. Handle both. */
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

function toPortalShape(row) {
  /* This database splits the report body into separate jsonb columns
     (film_grades, athletic_grades, gates, ...). The portal expects them
     reassembled under one raw object with these exact keys. If a single
     raw column ever appears instead, it is used as the base. */
  const raw = parseRaw(pick(row, ['raw', 'raw_data', 'rawdata', 'data'], null));
  if (row.film_grades      && !raw.traitGrades)      raw.traitGrades      = parseRaw(row.film_grades);
  if (row.athletic_grades  && !raw.athleticGrades)   raw.athleticGrades   = parseRaw(row.athletic_grades);
  if (row.athletic_raw     && !raw.athleticRaw)      raw.athleticRaw      = parseRaw(row.athletic_raw);
  if (row.production_grades && !raw.productionGrades) raw.productionGrades = parseRaw(row.production_grades);
  if (row.production_raw   && !raw.productionRaw)    raw.productionRaw    = parseRaw(row.production_raw);
  if (row.gates            && !raw.gates)            raw.gates            = parseRaw(row.gates);
  if (row.interview_data   && !raw.interview)        raw.interview        = parseRaw(row.interview_data);
  if (row.track            && !raw.track)            raw.track            = parseRaw(row.track);
  return {
    id:                 pick(row, ['id', 'report_id']),
    prospect:           pick(row, ['prospect', 'prospect_name', 'player_name', 'name'], 'Unnamed prospect'),
    position:           String(pick(row, ['position', 'pos'], 'ATH')).toUpperCase(),
    archetype:          pick(row, ['archetype', 'role']),
    classYear:          pick(row, ['class_year', 'classyear', 'grad_year', 'class']),
    school:             pick(row, ['school', 'high_school', 'highschool']),
    height:             pick(row, ['height']),
    weight:             pick(row, ['weight']),
    filmLink:           pick(row, ['film_link', 'filmlink', 'film_url', 'hudl']),
    evalCamp:           pick(row, ['eval_camp', 'evalcamp', 'camp', 'evaluation_camp']),
    scoutName:          pick(row, ['scout_name', 'scoutname', 'scout'], 'InHome Scout Network'),
    dateEvaluated:      pick(row, ['date_evaluated', 'dateevaluated', 'eval_date']),
    footballIQ:  Number(pick(row, ['football_iq', 'footballiq', 'iq'], 5)) || 5,
    narrative:          pick(row, ['narrative', 'notes', 'scout_notes'], ''),
    recommendationTier: pick(row, ['recommendation_tier', 'recommendationtier', 'tier']),
    inhomeScore:        pick(row, ['inhome_score', 'inhomescore', 'score']),
    translationIndex:   pick(row, ['translation_index', 'translationindex', 'ti']),
    lat:                pick(row, ['lat', 'latitude']),
    lng:                pick(row, ['lng', 'longitude']),
    createdAt:          pick(row, ['created_at', 'createdat', 'submitted_at']),
    raw
  };
}

/* Tables to try, most likely first. If none exist, the error response lists
   the tables that actually do, so the next fix is a one line change. */
const TABLE_CANDIDATES = ['scout_reports', 'reports', 'scouting_reports', 'prospect_reports', 'eis_reports'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET')     return reply(405, { success: false, error: 'Use GET.' });

  const connectionString =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    return reply(500, {
      success: false,
      error: 'No database connection string found.',
      fix: 'In Netlify: Project configuration > Environment variables. Add DATABASE_URL (or NETLIFY_DATABASE_URL) with the Neon connection string, then redeploy.'
    });
  }

  const requiredKey = process.env.PORTAL_ACCESS_KEY;
  if (requiredKey) {
    const params = event.queryStringParameters || {};
    const supplied = (event.headers && (event.headers['x-access-key'] || event.headers['X-Access-Key'])) || params.key;
    if (supplied !== requiredKey) return reply(401, { success: false, error: 'Missing or invalid access key.' });
  }

  const params = event.queryStringParameters || {};
  let limit = parseInt(params.limit, 10);
  if (isNaN(limit) || limit < 1) limit = 200;
  if (limit > 500) limit = 500;

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    let rows = null, tableUsed = null, lastErr = null;
    for (const table of TABLE_CANDIDATES) {
      try {
        const res = await client.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT $1`, [limit]);
        rows = res.rows; tableUsed = table;
        break;
      } catch (err) {
        lastErr = err;
        if (!/does not exist/i.test(String(err.message))) throw err;   // real error, stop
      }
    }

    if (rows === null) {
      // None of the candidates exist. List what does, to make the fix obvious.
      const t = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
      return reply(500, {
        success: false,
        error: 'No reports table found. Tried: ' + TABLE_CANDIDATES.join(', '),
        tablesInDatabase: t.rows.map(r => r.table_name),
        fix: 'Tell Claude which table in tablesInDatabase holds the reports; it is a one line change in this file.'
      });
    }

    if (params.debug === '1') {
      return reply(200, {
        success: true,
        table: tableUsed,
        rowCount: rows.length,
        columns: rows.length ? Object.keys(rows[0]) : [],
        sampleRow: rows.length ? rows[0] : null
      });
    }

    let reports = rows.map(toPortalShape);
    if (params.position) {
      const want = String(params.position).toUpperCase();
      reports = reports.filter(r => r.position === want);
    }
    if (params.school) {
      const want = String(params.school).toLowerCase();
      reports = reports.filter(r => (r.school || '').toLowerCase().includes(want));
    }

    return reply(200, { success: true, table: tableUsed, count: reports.length, reports });

  } catch (err) {
    console.error('list-reports failed:', err);
    const msg = String(err.message || err);
    let fix = 'Check the Netlify function log for the full error.';
    if (/password|authentication|SASL|SSL/i.test(msg)) {
      fix = 'The database rejected the connection. Confirm DATABASE_URL in Netlify matches the current Neon connection string.';
    }
    return reply(500, { success: false, error: msg, fix });
  } finally {
    try { await client.end(); } catch (e) {}
  }
};
