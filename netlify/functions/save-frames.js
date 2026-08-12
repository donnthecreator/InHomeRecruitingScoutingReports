/* =====================================================================
   save-frames.js
   Deploy to: netlify/functions/save-frames.js  (REPORTS repo)

   Stores still frames and headshots to Netlify Blobs. Called after a
   report already saved to Neon, so a failure here never loses the
   report itself — only the image.

   Key convention (must match frame.js and every page that renders one):
     film frame:  the rep id itself
     headshot:    headshot_<reportId>

   REQUIRES: @netlify/blobs. If it's not in your package.json:
     npm install @netlify/blobs
===================================================================== */

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
  }

  const { frames } = body;
  if (!Array.isArray(frames) || !frames.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'frames array required' }) };
  }

  try {
    const store = getStore('inhome-frames');

    for (const f of frames) {
      if (!f.key || !f.dataUrl) continue;
      // dataUrl looks like "data:image/jpeg;base64,AAAA..." — strip the header.
      const match = f.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) continue;
      const [, contentType, base64Data] = match;
      const buffer = Buffer.from(base64Data, 'base64');
      await store.set(f.key, buffer, { metadata: { contentType } });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, stored: frames.length })
    };
  } catch (err) {
    console.error('save-frames error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
