/* =====================================================================
   list-programs.js
   Deploy to: netlify/functions/list-programs.js  (BOTH repos, or one
   repo with CORS open to the other site's origin)

   Returns the school directory for the logo dropdown. This is the single
   source of truth that replaces the PROGRAMS const in app_tail.js.

   Never returns access_code. That column lives in the same table but is
   an admin secret, and this endpoint is called from the browser.

   Query params:
     ?division=FBS,FCS      filter by division (default: all active)
     ?q=alab                type-ahead filter on name

   ENV: DATABASE_URL
===================================================================== */
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  const params   = event.queryStringParameters || {};
  const q        = (params.q || '').trim();
  const division = (params.division || '').trim();
  const divisions = division ? division.split(',').map(d => d.trim().toUpperCase()) : null;

  try {
    let rows;

    if (divisions && q) {
      rows = await sql`
        SELECT school_key, name, short_name, conference, division, espn_logo_id, primary_color, is_client
        FROM programs
        WHERE active AND division = ANY(${divisions})
          AND (name ILIKE ${'%' + q + '%'} OR short_name ILIKE ${'%' + q + '%'} OR school_key ILIKE ${q + '%'})
        ORDER BY division, short_name NULLS LAST, name`;
    } else if (divisions) {
      rows = await sql`
        SELECT school_key, name, short_name, conference, division, espn_logo_id, primary_color, is_client
        FROM programs
        WHERE active AND division = ANY(${divisions})
        ORDER BY division, short_name NULLS LAST, name`;
    } else if (q) {
      rows = await sql`
        SELECT school_key, name, short_name, conference, division, espn_logo_id, primary_color, is_client
        FROM programs
        WHERE active
          AND (name ILIKE ${'%' + q + '%'} OR short_name ILIKE ${'%' + q + '%'} OR school_key ILIKE ${q + '%'})
        ORDER BY division, short_name NULLS LAST, name`;
    } else {
      rows = await sql`
        SELECT school_key, name, short_name, conference, division, espn_logo_id, primary_color, is_client
        FROM programs
        WHERE active
        ORDER BY division, short_name NULLS LAST, name`;
    }

    /* Logo URL is built here so both front ends stay consistent, and so
       the LOGO_MODE kill switch has one place to flip. */
    const logoMode = process.env.LOGO_MODE !== 'false';
    const programs = rows.map(r => ({
      ...r,
      logo_url: (logoMode && r.espn_logo_id)
        ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${r.espn_logo_id}.png`
        : null
    }));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, count: programs.length, programs }) };
  } catch (err) {
    console.error('list-programs error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
