"use client";

import { use } from "react";
import MediaDetail from "@/components/MediaDetail";

export default function TVDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MediaDetail id={id} mediaType="tv" />;
}
