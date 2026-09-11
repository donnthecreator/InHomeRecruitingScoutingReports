/* =====================================================================
   lib/blobs.js
   One place to open the 'inhome-frames' blob store.

   Netlify normally injects blob credentials into functions automatically.
   On this site that injection is not happening, so getStore('name')
   throws "The environment has not been configured to use Netlify Blobs".
   This helper tries the automatic path first, then falls back to explicit
   credentials from env vars.

   REQUIRED ENV (set both in Site configuration -> Environment variables).
   Netlify reserves the NETLIFY_ prefix and may refuse those names in the
   UI, so non-reserved aliases are accepted too. Set ONE from each row:

     site id:  INHOME_SITE_ID   or SITE_ID   or NETLIFY_SITE_ID
               value = Site configuration -> General -> Site ID (a UUID)

     token:    INHOME_BLOBS_TOKEN or BLOBS_TOKEN or NETLIFY_BLOBS_TOKEN
               value = a personal access token from
               User settings -> Applications -> Personal access tokens

   Living in lib/ keeps Netlify from treating this file as its own function.
===================================================================== */
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'inhome-frames';

function frameStore() {
  try {
    return getStore(STORE_NAME);
  } catch (autoErr) {
    /* Env var keys are case-sensitive; accept whatever case the value
       actually got saved under in the Netlify UI. */
    const siteID = process.env.INHOME_SITE_ID || process.env.inhome_site_id ||
                   process.env.SITE_ID || process.env.site_id || process.env.NETLIFY_SITE_ID;
    const token  = process.env.INHOME_BLOBS_TOKEN || process.env.inhome_blobs_token ||
                   process.env.BLOBS_TOKEN || process.env.blobs_token ||
                   process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN;
    if (!siteID || !token) {
      const missing = [!siteID && 'a site id (INHOME_SITE_ID or SITE_ID)',
                       !token && 'a token (INHOME_BLOBS_TOKEN or BLOBS_TOKEN)'].filter(Boolean).join(' and ');
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
