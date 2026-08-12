/* =====================================================================
   frame.js
   Deploy to: netlify/functions/frame.js  (REPORTS repo, same store as
   save-frames.js — both must use getStore('inhome-frames'))

   GET /.netlify/functions/frame?key=<key>

   Serves whatever save-frames.js stored under that key: a film frame
   (key = rep id) or a headshot (key = headshot_<reportId>). Every page
   that renders a headshot img tag points straight at this URL and
   relies on the browser's onerror to fall back to initials if it 404s.
===================================================================== */

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const key = (event.queryStringParameters || {}).key;
  if (!key) {
    return { statusCode: 400, body: 'key required' };
  }

  try {
    const store = getStore('inhome-frames');
    const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });

    if (!result) {
      return { statusCode: 404, body: 'Not found' };
    }

    const contentType = (result.metadata && result.metadata.contentType) || 'image/jpeg';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: Buffer.from(result.data).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('frame error:', err);
    return { statusCode: 404, body: 'Not found' };
  }
};
