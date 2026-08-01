import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Navbar />
      <div className="min-h-screen bg-ink pb-16 pt-[56px] md:pb-0">{children}</div>
      <MobileNav />
    </RequireAuth>
  );
}
