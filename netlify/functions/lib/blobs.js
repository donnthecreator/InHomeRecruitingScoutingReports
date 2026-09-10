/* =====================================================================
   lib/blobs.js
   One place to open the 'inhome-frames' blob store.

   Netlify normally injects blob credentials into functions automatically.
   On this site that injection is not happening, so getStore('name')
   throws "The environment has not been configured to use Netlify Blobs".
   This helper tries the automatic path first, then falls back to explicit
   credentials from env vars.

   REQUIRED ENV (set both in Site configuration -> Environment variables):
     NETLIFY_SITE_ID     Site configuration -> General -> Site ID
     NETLIFY_BLOBS_TOKEN Personal access token from
                         User settings -> Applications -> Personal access tokens

   Living in lib/ keeps Netlify from treating this file as its own function.
===================================================================== */
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'inhome-frames';

function frameStore() {
  try {
    return getStore(STORE_NAME);
  } catch (autoErr) {
    const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN;
    if (!siteID || !token) {
      const missing = [!siteID && 'NETLIFY_SITE_ID', !token && 'NETLIFY_BLOBS_TOKEN'].filter(Boolean).join(' and ');
      throw new Error(
        `Netlify Blobs is not configured automatically and ${missing} ` +
        `is not set. Add it under Site configuration -> Environment variables. ` +
        `(underlying error: ${autoErr.message})`
      );
    }
    return getStore({ name: STORE_NAME, siteID, token });
  }
}

module.exports = { frameStore, STORE_NAME };
