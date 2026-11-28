import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Đăng ký | SkyRoute',
  description:
    'Tạo tài khoản SkyRoute để lưu và đồng bộ lịch trình du lịch thông minh.',
};

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-editorial text-2xl font-bold text-slate-900 sm:text-3xl">
          Tạo tài khoản mới
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Bắt đầu lập lịch trình 4 khung giờ và lưu trữ các chuyến đi của riêng
          bạn.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
