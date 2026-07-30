"use client";

import { use } from "react";
import MediaDetail from "@/components/MediaDetail";

export default function MovieDetailsPage({ params }) {
  const { id } = use(params);
  return <MediaDetail id={id} mediaType="movie" />;
}
