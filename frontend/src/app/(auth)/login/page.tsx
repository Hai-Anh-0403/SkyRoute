import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Đăng nhập | SkyRoute',
  description: 'Đăng nhập vào nền tảng lập lịch trình du lịch thích ứng thời tiết SkyRoute.',
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">
        Đăng nhập
      </h1>
      <LoginForm />
    </div>
  );
}
