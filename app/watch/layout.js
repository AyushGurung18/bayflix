import RequireAuth from "@/components/RequireAuth";

export default function WatchLayout({ children }) {
  return (
    <RequireAuth>
      <div className="bg-black">{children}</div>
    </RequireAuth>
  );
}
