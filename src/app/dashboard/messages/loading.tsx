export default function MessagesLoading() {
  return (
    <div className="flex flex-col min-h-0 h-[calc(100dvh-11rem)] sm:h-[calc(100dvh-10rem)] lg:h-[calc(100vh-7rem)] animate-pulse">
      <div className="mb-6 shrink-0 space-y-2">
        <div className="h-8 w-40 rounded-lg bg-[rgba(255,255,255,0.03)]" />
        <div className="h-4 w-64 rounded bg-[rgba(255,255,255,0.03)]" />
      </div>
      <div className="flex-1 min-h-0 rounded-xl bg-white/[0.03] border border-[rgba(0, 229, 255,0.1)]" />
    </div>
  );
}
