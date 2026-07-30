export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink">
      <div className="flex flex-col items-center gap-4">
        <span className="text-4xl font-black italic tracking-tight text-brand">
          BAYFLIX
        </span>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full w-1/3 animate-[loading_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
