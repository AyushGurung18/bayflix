export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-neutral-800 bg-ink px-6 py-10 text-neutral-500 sm:px-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs">
          Not affiliated with Netflix. Movie and TV data courtesy of{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-300"
          >
            TMDB
          </a>
          .
        </p>
        <p className="mt-3 text-xs">
          &copy; {new Date().getFullYear()} Bayflix &mdash;{" "}
          <a
            href="https://ayushgurung.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-300"
          >
            Ayush Gurung
          </a>
        </p>
      </div>
    </footer>
  );
}
