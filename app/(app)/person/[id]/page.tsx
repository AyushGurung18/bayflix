"use client";

import { use } from "react";
import PersonDetail from "@/components/PersonDetail";

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PersonDetail id={id} />;
}
