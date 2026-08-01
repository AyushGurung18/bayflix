"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, MessageSquare } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import type { TmdbReview } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface ReviewsSectionProps {
  reviews?: TmdbReview[];
  className?: string;
}

export default function ReviewsSection({ reviews, className = "" }: ReviewsSectionProps) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <MessageSquare size={18} className="text-brand" /> Reviews
      </h2>
      {/* Capped height with its own scroll — reviews can run long, and this
          keeps the overall page from growing much taller just to fit them. */}
      <div data-lenis-prevent className="flex max-h-[560px] flex-col gap-4 overflow-y-auto pr-1">
        {reviews.slice(0, 10).map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: TmdbReview }) {
  const [expanded, setExpanded] = useState(false);
  const rating = review.author_details?.rating;
  const avatarPath = review.author_details?.avatar_path?.replace(/^\/https?:\/\//, "");
  const isFullUrl = avatarPath?.startsWith("http");
  const long = review.content.length > 400;
  const text = expanded || !long ? review.content : `${review.content.slice(0, 400)}…`;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink-card">
          {avatarPath ? (
            <Image
              src={isFullUrl ? avatarPath : (posterUrl(avatarPath, "w45") ?? "")}
              alt={review.author}
              fill
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-neutral-400">
              {review.author[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{review.author}</p>
          <p className="text-xs text-neutral-500">{timeAgo(review.created_at)}</p>
        </div>
        {typeof rating === "number" && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-400">
            <Star size={12} fill="currentColor" /> {rating}/10
          </span>
        )}
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">{text}</p>
      {long && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-semibold text-brand hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
