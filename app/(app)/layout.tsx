import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Navbar />
      <div className="min-h-screen bg-ink pt-[56px]">{children}</div>
    </RequireAuth>
  );
}
