/* =====================================================================
   share-report.js
   GET /.netlify/functions/share-report?id=<reportId>&t=<sig>

   Public read of ONE report, gated by a signature the admin panel mints
   (admin-data.js action shareLink). The signature is HMAC(ADMIN_SECRET,
   'share:'+id), so links can't be enumerated by changing the id.
   Report shape is identical to list-reports.js; this just wraps it.

   ENV: ADMIN_SECRET, DATABASE_URL
===================================================================== */
const crypto = require('crypto');
const listReports = require('./list-reports');

function shareSig(reportId) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET).update('share:' + reportId).digest('hex').slice(0, 24);
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const id = parseInt(qs.id, 10);
  const t = String(qs.t || '');
  if (!id || !t) return { statusCode: 400, body: 'id and t required' };
  if (!process.env.ADMIN_SECRET) return { statusCode: 500, body: 'ADMIN_SECRET not set' };

  const expected = shareSig(id);
  const a = Buffer.from(t), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid share link' }) };
  }
  return listReports.handler({ ...event, queryStringParameters: { id: String(id) } });
};
