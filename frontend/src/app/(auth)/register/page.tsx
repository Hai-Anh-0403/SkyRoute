import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Đăng ký | SkyRoute',
  description: 'Tạo tài khoản SkyRoute để lưu và đồng bộ lịch trình du lịch thông minh.',
};

export default function RegisterPage() {
  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
        Tạo tài khoản mới
      </h1>
      <RegisterForm />
    </div>
  );
}
