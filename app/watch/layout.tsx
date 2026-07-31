import RequireAuth from "@/components/RequireAuth";
import type { ReactNode } from "react";

export default function WatchLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="bg-black">{children}</div>
    </RequireAuth>
  );
}
