/* =====================================================================
   frame.mjs
   Serves a stored EIS still frame as an image.

   DEPLOY
     Put this file in:  netlify/functions/frame.mjs

   USE IN A REPORT
     <img src="/.netlify/functions/frame?key=rep_1758246873201">

   Blobs are not public URLs by design, so reads go through this
   function. The key pattern is validated strictly so a caller cannot
   request arbitrary keys or walk the store.
===================================================================== */

import { getStore } from "@netlify/blobs";

const KEY_OK = /^rep_[0-9]{10,20}$/;

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";

  if (!KEY_OK.test(key)) {
    return new Response("Bad key", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  try {
    const store = getStore("eis-frames");
    const blob = await store.getWithMetadata(key, { type: "arrayBuffer" });

    if (!blob || !blob.data) {
      return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
    }

    return new Response(blob.data, {
      headers: {
        "Content-Type": blob.metadata?.contentType || "image/jpeg",
        /* frames are immutable once written, so cache hard.
           this is what keeps egress near zero as reports get reopened */
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response("Error", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
};
