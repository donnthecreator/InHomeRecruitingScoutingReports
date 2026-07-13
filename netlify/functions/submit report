const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);

    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });

    await client.connect();

    const query = `
      INSERT INTO reports (
        prospect_name, position, camp, class_year, school, height, weight,
        film_link, archetype, film_grades, athletic_grades, athletic_raw,
        production_grades, production_raw, gates, football_iq, interview_data,
        scout_name, scout_notes, recommendation_tier, inhome_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING id;
    `;

    const result = await client.query(query, [
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
      parseFloat(data.inhomeScore) || 0
    ]);

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reportId: result.rows[0].id,
        message: 'Report submitted successfully'
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
  }
};
