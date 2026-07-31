const LINK_GROUPS = [
  ["FAQ", "Help Centre", "Account", "Media Centre"],
  ["Investor Relations", "Jobs", "Ways to Watch", "Terms of Use"],
  ["Privacy", "Cookie Preferences", "Corporate Information", "Contact Us"],
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-neutral-800 bg-ink px-6 py-12 text-neutral-400 sm:px-16">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-sm">
          Questions? Call{" "}
          <span className="text-neutral-300">000-800-919-1694</span>
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          {LINK_GROUPS.flat().map((label) => (
            <span key={label} className="w-fit cursor-default text-neutral-400">
              {label}
            </span>
          ))}
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
          . Not affiliated with Netflix. Movie data courtesy of TMDB.
        </p>
      </div>
    </footer>
  );
}
