/* =====================================================================
   background-file.js
   GET /.netlify/functions/background-file?prospectId=<id>
   Authorization: Bearer <admin token>

   Returns a prospect's confidential background report (uploaded from the
   admin profile card via upload-prospect-photo kind=background). Admin
   only. frame.js refuses bg_ keys, so this is the only way to read it.
===================================================================== */
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const { frameStore } = require('./lib/blobs');
const sql = neon(process.env.DATABASE_URL);

function verifyAdmin(event) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const header = event.headers.authorization || event.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const [expiresStr, sig] = token.split('.');
  if (!expiresStr || !sig) return false;
  if (!Number(expiresStr) || Date.now() > Number(expiresStr)) return false;
  const expected = crypto.createHmac('sha256', secret).update(expiresStr).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

exports.handler = async (event) => {
  if (!verifyAdmin(event)) return { statusCode: 401, body: 'Admin only' };
  const id = parseInt((event.queryStringParameters || {}).prospectId, 10);
  if (!id) return { statusCode: 400, body: 'prospectId required' };
  try {
    const [row] = await sql`SELECT background_key, background_name FROM prospects WHERE id = ${id}`;
    if (!row || !row.background_key) return { statusCode: 404, body: 'Not found' };
    const result = await frameStore().getWithMetadata(row.background_key, { type: 'arrayBuffer' });
    if (!result) return { statusCode: 404, body: 'Not found' };
    const contentType = (result.metadata && result.metadata.contentType) || 'application/pdf';
    return {
      statusCode: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'private, no-store' },
      body: Buffer.from(result.data).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('background-file error:', err);
    return { statusCode: 500, body: 'Error' };
  }
};
