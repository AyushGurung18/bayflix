// Cloudflare Worker that serves HLS assets (.m3u8 / .ts) out of an R2 bucket
// bound as MY_BUCKET. This is the backend the "Play" button in the app talks
// to (see components/NetflixPlayer.js / NEXT_PUBLIC_HLS_WORKER_BASE_URL) —
// it is deployed separately from the Next.js app (`wrangler deploy`), not
// part of this repo's build.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+/, "");

    try {
      const object = await env.MY_BUCKET.get(key);
      if (!object) {
        return new Response("File not found", { status: 404 });
      }

      const headers = new Headers();
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Content-Type", getMimeType(key));

      return new Response(object.body, { headers });
    } catch (err) {
      return new Response("Internal error: " + err.message, { status: 500 });
    }
  },
};

function getMimeType(key) {
  if (key.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (key.endsWith(".ts")) return "video/mp2t";
  return "application/octet-stream";
}
