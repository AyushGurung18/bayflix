export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-neutral-800 bg-ink px-6 py-12 text-neutral-400 sm:px-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm">
          Bayflix is an independent portfolio project — not affiliated with Netflix. Movie and TV
          data courtesy of{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-neutral-600 underline-offset-2 hover:text-neutral-300"
          >
            TMDB
          </a>
          .
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a
            href="https://ayushgurung.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-neutral-600 underline-offset-2 hover:text-neutral-300"
          >
            Portfolio
          </a>
          <a
            href="https://github.com/AyushGurung18/Movie-Search-App"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-neutral-600 underline-offset-2 hover:text-neutral-300"
          >
            Source on GitHub
          </a>
        </div>
        <p className="mt-10 text-xs text-neutral-500">
          &copy; {new Date().getFullYear()} Bayflix &mdash; built by{" "}
          <a
            href="https://ayushgurung.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-neutral-600 underline-offset-2 hover:text-neutral-300"
          >
            Ayush Gurung
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
