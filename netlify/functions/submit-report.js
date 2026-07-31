const { Client } = require('pg');

/* ============================================================================
   submit-report.js

   WHAT CHANGED AND WHY
   The form sends everything the scout entered inside data.raw. This function
   was writing only six known keys out of it (traitGrades, athleticGrades,
   athleticRaw, productionGrades, productionRaw, gates, interview, track).
   Anything new was silently dropped on the way in, which is why
   recommendedPrograms and eisReps never reached the database.

   The fix is one column. Everything in data.raw is now also written whole to
   a jsonb column named "raw". list-reports.js already looks for that column
   and uses it, so no other file changes.

   REQUIRED FIRST, run this once in the Neon SQL editor:

       ALTER TABLE reports ADD COLUMN IF NOT EXISTS raw jsonb;

   If you deploy this before running that, nothing breaks. The insert below
   detects a missing "raw" column and automatically falls back to the exact
   22-column insert that was here before. You just keep losing the new keys
   until the column exists.

   All 22 original columns, their order, and their values are unchanged.
   ========================================================================== */

const COLUMNS = `
        prospect_name, position, camp, class_year, school, height, weight,
        film_link, archetype, film_grades, athletic_grades, athletic_raw,
        production_grades, production_raw, gates, football_iq, interview_data,
        scout_name, scout_notes, recommendation_tier, inhome_score, track`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;

  try {
    const data = JSON.parse(event.body);

    client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();

    /* The 22 original values, unchanged and in the original order. */
    const baseValues = [
      data.prospect || null,
      data.position || null,
      data.evalCamp || null,
      data.classYear || null,
      data.school || null,
      data.height || null,
      data.weight || null,
      data.filmLink || null,
      data.archetype || null,
      JSON.stringify(data.raw?.traitGrades || {}),
      JSON.stringify(data.raw?.athleticGrades || {}),
      JSON.stringify(data.raw?.athleticRaw || {}),
      JSON.stringify(data.raw?.productionGrades || {}),
      JSON.stringify(data.raw?.productionRaw || {}),
      JSON.stringify(data.raw?.gates || {}),
      data.footballIQ || null,
      JSON.stringify(data.raw?.interview || {}),
      data.scoutName || null,
      data.narrative || null,
      data.recommendationTier || null,
      parseFloat(data.inhomeScore) || 0,
      JSON.stringify(data.raw?.track || {})
    ];

    /* Everything the scout entered, kept whole. Scout identity is folded in
       so attribution survives even though it arrives outside data.raw. */
    const rawPayload = JSON.stringify(
      Object.assign({}, data.raw || {}, {
        scoutId: data.scoutId || null,
        scoutRole: data.scoutRole || null,
        scoutRegion: data.scoutRegion || null,
        translationIndex: data.translationIndex || null
      })
    );

    const withRaw = `
      INSERT INTO reports (${COLUMNS}, raw
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      RETURNING id;
    `;

    const withoutRaw = `
      INSERT INTO reports (${COLUMNS}
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING id;
    `;

    let result;
    let storedRaw = true;

    try {
      result = await client.query(withRaw, baseValues.concat([rawPayload]));
    } catch (err) {
      /* 42703 = undefined_column. Only fall back for that one case; any other
         error is a real problem and should surface. */
      const missingColumn =
        err.code === '42703' || /column "raw" .*does not exist/i.test(String(err.message));
      if (!missingColumn) throw err;

      console.warn('submit-report: "raw" column not found, saving without it. ' +
                   'Run: ALTER TABLE reports ADD COLUMN IF NOT EXISTS raw jsonb;');
      result = await client.query(withoutRaw, baseValues);
      storedRaw = false;
    }

    await client.end();
    client = null;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reportId: result.rows[0].id,
        storedRaw,
        message: storedRaw
          ? 'Report submitted successfully'
          : 'Report saved. Add the raw column to store film reps and recommendations.'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  } finally {
    if (client) { try { await client.end(); } catch (e) {} }
  }
};
