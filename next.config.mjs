// Derives the Bayflix API worker's hostname so its /avatar/:uid URLs can be
// allow-listed for next/image without hardcoding a *.workers.dev subdomain
// (or custom domain) that isn't known at authoring time.
const bayflixApiHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_BAYFLIX_API_BASE_URL ?? "").hostname;
  } catch {
    return undefined;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      // Google sign-in's photoURL — already rendered unconditionally
      // elsewhere (Navbar, Account Settings) without this, which was a
      // latent bug.
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      ...(bayflixApiHostname
        ? [{ protocol: "https", hostname: bayflixApiHostname, pathname: "/avatar/**" }]
        : []),
    ],
  },
};

export default nextConfig;
