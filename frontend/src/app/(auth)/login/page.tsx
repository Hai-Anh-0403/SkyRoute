import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Đăng nhập | SkyRoute',
  description:
    'Đăng nhập vào nền tảng lập lịch trình du lịch thích ứng thời tiết SkyRoute.',
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-editorial text-2xl font-bold text-slate-900 sm:text-3xl">
          Đăng nhập
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Tiếp tục quản lý chuyến đi và đồng bộ dự báo thời tiết của bạn.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
