/* =====================================================================
   list-scouts.js
   Deploy to: netlify/functions/list-scouts.js  (PORTAL repo — CommonJS,
   matching verify-admin.js, admin-data.js, list-targets.js. If your
   portal repo's package.json says "type": "module", tell me and I'll
   convert all four to .mjs, same as the reports repo functions.)

   Public, no auth — same trust level as list-targets.js. Returns
   active scouts keyed by access code, in the exact shape index-14.html
   and scout-home.html expect for their SCOUTS object:
     { "TFOSTER26": { id, name, role, region }, ... }
===================================================================== */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

exports.handler = async () => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'   // roster is non-sensitive (name/role/region, no codes exposed here beyond what's already client-visible); scoped to * so the reports-site report form can read it cross-origin
  };

  try {
    const rows = await sql`
      SELECT scout_id, access_code, name, role, region
      FROM scouts
      WHERE active = TRUE
      ORDER BY name`;

    const scouts = {};
    for (const r of rows) {
      scouts[r.access_code] = {
        id: r.scout_id,
        name: r.name,
        role: r.role,
        region: r.region
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(scouts)
    };
  } catch (err) {
    console.error('list-scouts error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
