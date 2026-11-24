/* =====================================================================
   state-offers.js
   GET /.netlify/functions/state-offers?state=CO

   The Offer Tracker on a high school's portal: every high school player
   in that state with a publicly reported college offer, what offered him,
   and whether he has committed. Built from public recruiting reports
   (247Sports, On3, MaxPreps, newspapers, school sites) by a research pass,
   saved in lib/state-offers/<STATE>.json, and refreshed by committing a
   new file. Every offer carries the URL it was reported at.

   No contact details of any kind are stored or served.

   ENV: none
===================================================================== */

/* Static requires so the bundler ships every state file with the function.
   Add a line here when a new state's file is added. */
const STATES = {
  CO: require('./lib/state-offers/CO.json'),
};

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' };

exports.handler = async (event) => {
  const st = String((event.queryStringParameters || {}).state || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(st)) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'state required, e.g. CO' }) };
  const data = STATES[st];
  if (!data) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ state: st, retrieved: null, players: [] }) };
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
};
