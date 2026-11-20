'use client';

export default function TripWorkspaceError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-lg font-bold text-slate-900">
        Không thể tải Workspace lịch trình
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Đã xảy ra lỗi khi hiển thị dữ liệu chuyến đi.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
      >
        Thử lại
      </button>
    </div>
  );
}
