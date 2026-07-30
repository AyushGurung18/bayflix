export function SkeletonHero() {
  return (
    <div className="relative h-[62vw] max-h-[85vh] min-h-[420px] w-full overflow-hidden bg-ink-card">
      <div className="skeleton-shimmer absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end gap-4 px-4 pb-16 sm:px-10 sm:pb-24">
        <div className="skeleton-shimmer h-10 w-2/3 max-w-md rounded sm:h-14" />
        <div className="skeleton-shimmer h-4 w-1/2 max-w-sm rounded" />
        <div className="skeleton-shimmer h-4 w-2/3 max-w-lg rounded" />
        <div className="mt-2 flex gap-3">
          <div className="skeleton-shimmer h-11 w-28 rounded" />
          <div className="skeleton-shimmer h-11 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="relative aspect-[2/3] w-[180px] shrink-0 overflow-hidden rounded-md sm:w-[230px]">
      <div className="skeleton-shimmer absolute inset-0" />
    </div>
  );
}

export function SkeletonRow({ count = 7 }) {
  return (
    <section className="py-4">
      <div className="mb-3 px-4 sm:px-10">
        <div className="skeleton-shimmer h-6 w-40 rounded" />
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-hidden px-4 sm:gap-3 sm:px-10">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

export function SkeletonBrowse() {
  return (
    <div>
      <SkeletonHero />
      <div className="relative z-10 -mt-10 sm:-mt-16">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="pb-16">
      <div className="relative h-[46vw] max-h-[70vh] min-h-[360px] w-full overflow-hidden bg-ink-card">
        <div className="skeleton-shimmer absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      </div>
      <div className="relative z-10 -mt-24 flex flex-col gap-6 px-4 sm:-mt-32 sm:flex-row sm:px-10">
        <div className="skeleton-shimmer mx-auto h-64 w-44 shrink-0 overflow-hidden rounded-lg sm:mx-0 sm:h-72 sm:w-48" />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="skeleton-shimmer h-9 w-2/3 max-w-md rounded" />
          <div className="skeleton-shimmer h-4 w-1/3 max-w-xs rounded" />
          <div className="skeleton-shimmer h-4 w-full max-w-2xl rounded" />
          <div className="skeleton-shimmer h-4 w-5/6 max-w-2xl rounded" />
          <div className="flex gap-3">
            <div className="skeleton-shimmer h-11 w-32 rounded" />
            <div className="skeleton-shimmer h-11 w-36 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }) {
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
