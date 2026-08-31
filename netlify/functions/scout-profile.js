/* =====================================================================
   scout-profile.mjs
   Deploy to: netlify/functions/scout-profile.mjs

   GET /.netlify/functions/scout-profile?id=<scoutId>
   Returns one active scout's full profile for scout.html. Public, same
   trust level as list-scouts — it's a shareable resume, nothing secret.
===================================================================== */

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const headers = { 'Content-Type': 'application/json' };

  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers });

  try {
    const rows = await sql`
      SELECT scout_id, name, role, region, active,
             headshot_url, hero_url, hometown, college, play_position,
             pro_experience, years_active, brand, brand_role, accolade,
             developed, programs, bio, bio_evaluator, phone, instagram, blurb_override
      FROM scouts
      WHERE scout_id = ${id} AND active = TRUE
      LIMIT 1`;

    if (!rows.length) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
    return new Response(JSON.stringify(rows[0]), { status: 200, headers });
  } catch (err) {
    console.error('scout-profile error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
