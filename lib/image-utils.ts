// A tiny animated-looking shimmer gradient, base64-encoded as a blurDataURL —
// gives next/image's placeholder="blur" something to show while a real TMDB
// poster/backdrop loads, instead of a hard pop-in. Same placeholder for every
// image (no per-image blur hash to fetch), which is the standard cheap
// version of this trick.
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#1f1f1f" offset="20%" />
      <stop stop-color="#2a2a2a" offset="50%" />
      <stop stop-color="#1f1f1f" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#1f1f1f" />
  <rect width="${w}" height="${h}" fill="url(#g)" />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === "undefined" ? Buffer.from(str).toString("base64") : window.btoa(str);

export const BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`;
