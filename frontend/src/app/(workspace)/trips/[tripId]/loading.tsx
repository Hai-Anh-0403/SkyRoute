export default function TripWorkspaceLoading() {
  return (
    <div className="grid min-h-screen grid-cols-1 gap-4 bg-slate-50 p-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-5">
        <div className="h-12 animate-pulse rounded-xl bg-white" />
        <div className="h-36 animate-pulse rounded-xl bg-white" />
        <div className="h-36 animate-pulse rounded-xl bg-white" />
      </div>
      <div className="min-h-[460px] animate-pulse rounded-xl bg-slate-200 lg:col-span-7" />
    </div>
  );
}
