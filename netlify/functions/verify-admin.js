/* =====================================================================
   verify-admin.js
   Deploy to: netlify/functions/verify-admin.js  (PORTAL repo)

   Checks the submitted code against the ADMIN_CODE env var and, on a
   match, returns a signed token good for 12 hours. The code itself is
   never sent to the browser and never appears in any HTML file.

   REQUIRED ENV VARS (Netlify > Site settings > Environment variables):
     ADMIN_CODE     the code you type on admin.html
     ADMIN_SECRET   any long random string (32+ chars) used to sign tokens

   Generate a secret with any password generator. Treat it like a
   password: if it leaks, rotate it and every token dies.
===================================================================== */

const crypto = require('crypto');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(expires, secret){
  return crypto.createHmac('sha256', secret).update(String(expires)).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ADMIN_CODE = process.env.ADMIN_CODE;
  const ADMIN_SECRET = process.env.ADMIN_SECRET;

  if (!ADMIN_CODE || !ADMIN_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server not configured. Set ADMIN_CODE and ADMIN_SECRET.' })
    };
  }

  let code;
  try {
    code = (JSON.parse(event.body || '{}').code || '').trim();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
  }

  // Constant-time compare so response timing does not leak the code.
  const a = Buffer.from(code);
  const b = Buffer.from(ADMIN_CODE);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Code not recognized.' }) };
  }

  const expires = Date.now() + TOKEN_TTL_MS;
  const token = `${expires}.${sign(expires, ADMIN_SECRET)}`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, expires })
  };
};
