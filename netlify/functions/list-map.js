/* GET /.netlify/functions/list-map  — public, CORS-open: every prospect as a
   map pin for the coach portal's Prospect Map. See lib/mappins.js. */
const { neon } = require('@neondatabase/serverless');
const { pins } = require('./lib/mappins');
const sql = neon(process.env.DATABASE_URL);
const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
exports.handler = async (event) => {
  try {
    const h = event.headers || {};
    const base = `${h['x-forwarded-proto'] || 'https'}://${h['x-forwarded-host'] || h.host || 'inhomecollegescouts.com'}`;
    const data = await pins(sql, base);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ count: data.pins.length, placed: data.pins.filter(p => p.lat != null).length, pins: data.pins, missingSchools: data.missingSchools.length }) };
  } catch (err) {
    console.error('list-map error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
