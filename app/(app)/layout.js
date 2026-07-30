import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";

export default function AppLayout({ children }) {
  return (
    <RequireAuth>
      <Navbar />
      <div className="min-h-screen bg-ink pt-[56px]">{children}</div>
    </RequireAuth>
  );
}
