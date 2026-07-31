import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <Image src="/images/bg-404.jpg" alt="" fill priority className="object-cover object-center" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <h1 className="bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-4xl font-black text-transparent sm:text-6xl">
          Lost your way?
        </h1>
        <p className="mt-4 max-w-md text-neutral-300">
          Sorry, we can&rsquo;t find that page. You&rsquo;ll find lots to explore on the home page.
        </p>
        <Link
          href="/"
          className="mt-8 rounded bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/80"
        >
          Bayflix Home
        </Link>
      </div>
    </div>
  );
}
